import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/services/prisma.service';
import { SecuritiesAvoidanceService } from './securities-avoidance.service';
import { AmlMonitoringService } from './aml-monitoring.service';
import { RefundRiskControlService } from './refund-risk-control.service';
import { ComplianceReportService } from './compliance-report.service';

export interface ComplianceCheckResult {
  allowed: boolean;
  securitiesCheck: SecuritiesCheckResult;
  amlCheck: AmlCheckResult;
  refundRiskCheck: RefundRiskCheckResult;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecuritiesCheckResult {
  allowed: boolean;
  productType: 'nft' | 'service' | 'token';
  messaging: string[];
  warnings: string[];
}

export interface AmlCheckResult {
  allowed: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  flags: string[];
  requiresManualReview: boolean;
}

export interface RefundRiskCheckResult {
  allowed: boolean;
  refundEligibility: boolean;
  riskScore: number;
  reasons: string[];
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private securitiesAvoidance: SecuritiesAvoidanceService,
    private amlMonitoring: AmlMonitoringService,
    private refundRiskControl: RefundRiskControlService,
    private complianceReport: ComplianceReportService,
  ) {}

  /**
   * Comprehensive compliance check for a transaction
   */
  async performComplianceCheck(
    userId: string,
    productType: 'nft' | 'service' | 'token',
    amount: number,
    metadata?: {
      ipAddress?: string;
      country?: string;
      paymentMethod?: string;
    },
  ): Promise<ComplianceCheckResult> {
    this.logger.log(`Performing compliance check for user ${userId}, product type: ${productType}, amount: ${amount}`);

    // 1. Securities attribute avoidance check
    const securitiesCheck = await this.securitiesAvoidance.checkProductCompliance(
      productType,
      amount,
      metadata?.paymentMethod,
    );

    // 2. AML monitoring check
    const amlCheck = await this.amlMonitoring.performAmlCheck(
      userId,
      amount,
      metadata?.country,
      metadata?.ipAddress,
    );

    // 3. Refund risk control check
    const refundRiskCheck = await this.refundRiskControl.assessRefundRisk(
      userId,
      productType,
      amount,
    );

    // Determine overall risk
    let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (!securitiesCheck.allowed || !amlCheck.allowed || !refundRiskCheck.allowed) {
      overallRisk = 'critical';
    } else if (amlCheck.riskLevel === 'high' || refundRiskCheck.riskScore > 70) {
      overallRisk = 'high';
    } else if (amlCheck.riskLevel === 'medium' || refundRiskCheck.riskScore > 40) {
      overallRisk = 'medium';
    }

    const allowed = securitiesCheck.allowed && amlCheck.allowed && refundRiskCheck.allowed;

    // Log compliance check
    await this.logComplianceCheck(userId, {
      productType,
      amount,
      allowed,
      overallRisk,
      securitiesCheck,
      amlCheck,
      refundRiskCheck,
    });

    return {
      allowed,
      securitiesCheck,
      amlCheck,
      refundRiskCheck,
      overallRisk,
    };
  }

  /**
   * Log compliance check for audit
   */
  private async logComplianceCheck(
    userId: string,
    data: {
      productType: string;
      amount: number;
      allowed: boolean;
      overallRisk: string;
      securitiesCheck: SecuritiesCheckResult;
      amlCheck: AmlCheckResult;
      refundRiskCheck: RefundRiskCheckResult;
    },
  ) {
    try {
      await (this.prisma as any).auditLog.create({
        data: {
          userId,
          action: 'COMPLIANCE_CHECK',
          resource: 'compliance',
          details: JSON.parse(JSON.stringify({
            ...data,
            timestamp: new Date().toISOString(),
          })),
        },
      });
    } catch (error) {
      this.logger.error('Failed to log compliance check', error);
    }
  }

  /**
   * Get compliance status for a user
   */
  async getUserComplianceStatus(userId: string) {
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      include: {
        transactions: {
          where: { status: 'CONFIRMED' as any },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      return { exists: false };
    }

    const amlStatus = await this.amlMonitoring.getUserAmlStatus(userId);
    const refundStatus = await this.refundRiskControl.getUserRefundStatus(userId);

    return {
      exists: true,
      userId: user.id,
      memberLevel: user.memberLevel,
      isVerified: user.isVerified,
      amlStatus,
      refundStatus,
      recentTransactions: (user as any).transactions?.length || 0,
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    reportType: 'monthly' | 'quarterly' | 'annual' = 'monthly',
  ) {
    return this.complianceReport.generateReport(startDate, endDate, reportType);
  }
}