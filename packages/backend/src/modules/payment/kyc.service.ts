import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../common/services/prisma.service';

export interface KYCVerificationResult {
  verified: boolean;
  level: 'none' | 'basic' | 'standard' | 'enhanced';
  riskScore: number;
  documentType?: string;
  expiresAt?: Date;
  rejectionReason?: string;
}

export interface KYCSubmissionResult {
  submissionId: string;
  verificationUrl: string;
  expiresAt: Date;
}

@Injectable()
export class KYCService {
  private sumsubApiKey: string;
  private sumsubApiUrl: string;
  private sumsubAppId: string;
  // Large transaction threshold: $100,000 USD
  private readonly LARGE_TRANSACTION_THRESHOLD = 100000;
  // Medium transaction threshold: $5,000 USD (requires crypto)
  private readonly MEDIUM_TRANSACTION_THRESHOLD = 5000;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private prisma: PrismaService,
  ) {
    this.sumsubApiKey = this.configService.get('SUMSUB_API_KEY', '');
    this.sumsubApiUrl = this.configService.get('SUMSUB_API_URL', 'https://api.sumsub.com');
    this.sumsubAppId = this.configService.get('SUMSUB_APP_ID', '');
  }

  /**
   * Check if a transaction requires KYC verification
   */
  requiresKYC(amount: number): boolean {
    return amount >= this.LARGE_TRANSACTION_THRESHOLD;
  }

  /**
   * Check if a transaction requires crypto payment (exceeds credit card limit)
   */
  requiresCryptoPayment(amount: number): boolean {
    return amount > this.MEDIUM_TRANSACTION_THRESHOLD;
  }

  /**
   * Get KYC requirement level based on transaction amount
   */
  getKYCLevel(amount: number): 'none' | 'basic' | 'standard' | 'enhanced' {
    if (amount >= this.LARGE_TRANSACTION_THRESHOLD) {
      return 'enhanced';
    } else if (amount >= 50000) {
      return 'standard';
    } else if (amount >= 10000) {
      return 'basic';
    }
    return 'none';
  }

  /**
   * Create KYC verification application
   */
  async createKYCApplication(userId: string, level: string): Promise<KYCSubmissionResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate unique external ID for the applicant
    const externalId = `KYC-${userId}-${Date.now()}`;

    try {
      // Create applicant in SumSub
      const response = await this.httpService.axiosRef.post(
        `${this.sumsubApiUrl}/resources/applicants`,
        {
          externalUserId: externalId,
          email: user.email,
          phone: null,
          firstName: user.address?.substring(0, 10) || 'User',
          lastName: user.address?.substring(10, 20) || externalId.substring(0, 10),
        },
        {
          headers: {
            'Authorization': `Bearer ${this.sumsubApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const applicantId = response.data.id;

      // Create verification session
      const sessionResponse = await this.httpService.axiosRef.post(
        `${this.sumsubApiUrl}/resources/applicants/${applicantId}/verificationSessions`,
        {
          sessionTTL: 3600, // 1 hour
        },
        {
          headers: {
            'Authorization': `Bearer ${this.sumsubApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const expiresAt = new Date(Date.now() + 3600 * 1000);

      // Store KYC application in database
      await this.prisma.systemConfig.upsert({
        where: { key: `kyc_${externalId}` },
        create: {
          key: `kyc_${externalId}`,
          value: {
            applicantId,
            userId,
            level,
            status: 'pending',
            expiresAt: expiresAt.toISOString(),
          },
          description: 'KYC application record',
        },
        update: {
          value: {
            applicantId,
            userId,
            level,
            status: 'pending',
            expiresAt: expiresAt.toISOString(),
          },
        },
      });

      return {
        submissionId: externalId,
        verificationUrl: sessionResponse.data.url,
        expiresAt,
      };
    } catch (error) {
      console.error('KYC application creation failed:', error.message);
      // Return mock data for development
      const mockId = `KYC-${userId}-${Date.now()}`;
      return {
        submissionId: mockId,
        verificationUrl: `${this.configService.get('FRONTEND_URL')}/kyc/verify?token=${mockId}`,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      };
    }
  }

  /**
   * Get KYC verification status
   */
  async getKYCStatus(userId: string): Promise<KYCVerificationResult> {
    const configs = await this.prisma.systemConfig.findMany({
      where: {
        key: { startsWith: 'kyc_' },
      },
    });

    const kycConfig = configs.find(
      (c) => c.value && typeof c.value === 'object' && (c.value as any).userId === userId,
    );

    if (!kycConfig) {
      return {
        verified: false,
        level: 'none',
        riskScore: 0,
      };
    }

    const kycData = kycConfig.value as any;

    // Check if expired
    if (kycData.expiresAt && new Date(kycData.expiresAt) < new Date()) {
      return {
        verified: false,
        level: 'none',
        riskScore: 0,
        rejectionReason: 'KYC verification expired',
      };
    }

    // Return based on status
    switch (kycData.status) {
      case 'approved':
        return {
          verified: true,
          level: kycData.level || 'standard',
          riskScore: kycData.riskScore || 20,
          documentType: kycData.documentType,
          expiresAt: kycData.expiresAt ? new Date(kycData.expiresAt) : undefined,
        };
      case 'rejected':
        return {
          verified: false,
          level: 'none',
          riskScore: 100,
          rejectionReason: kycData.rejectionReason || 'KYC verification rejected',
        };
      default:
        return {
          verified: false,
          level: kycData.level || 'none',
          riskScore: 50,
        };
    }
  }

  /**
   * Handle KYC webhook callback
   */
  async handleKYCCallback(data: {
    applicantId: string;
    reviewStatus: string;
    riskScore?: number;
    documentType?: string;
  }) {
    const configs = await this.prisma.systemConfig.findMany({
      where: {
        key: { startsWith: 'kyc_' },
      },
    });

    const kycConfig = configs.find(
      (c) => c.value && typeof c.value === 'object' && (c.value as any).applicantId === data.applicantId,
    );

    if (!kycConfig) {
      console.error('KYC application not found:', data.applicantId);
      return { success: false };
    }

    const kycData = kycConfig.value as any;
    let status = 'pending';
    let rejectionReason: string | undefined;

    switch (data.reviewStatus) {
      case 'approved':
        status = 'approved';
        break;
      case 'rejected':
        status = 'rejected';
        rejectionReason = 'KYC verification rejected by reviewer';
        break;
      case 'pending':
      default:
        status = 'pending';
    }

    await this.prisma.systemConfig.update({
      where: { key: kycConfig.key },
      data: {
        value: {
          ...kycData,
          status,
          riskScore: data.riskScore,
          documentType: data.documentType,
          rejectionReason,
          updatedAt: new Date().toISOString(),
        },
      },
    });

    // Update user verification status if approved
    if (status === 'approved') {
      await this.prisma.user.update({
        where: { id: kycData.userId },
        data: { isVerified: true },
      });
    }

    return { success: true, status };
  }

  /**
   * Validate payment based on KYC status
   */
  async validatePaymentForUser(userId: string, amount: number): Promise<{
    allowed: boolean;
    reason?: string;
    requiresKYC?: boolean;
    requiresCrypto?: boolean;
  }> {
    // Check if KYC is required
    if (this.requiresKYC(amount)) {
      const kycStatus = await this.getKYCStatus(userId);
      
      if (!kycStatus.verified) {
        return {
          allowed: false,
          reason: 'Large transaction requires KYC verification',
          requiresKYC: true,
        };
      }
    }

    // Check if crypto payment is required
    if (this.requiresCryptoPayment(amount)) {
      return {
        allowed: true,
        reason: 'Amount exceeds credit card limit, crypto payment required',
        requiresCrypto: true,
      };
    }

    return { allowed: true };
  }
}