import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/services/prisma.service';
import { PaymentMethod } from '@prisma/client';

export interface RiskCheckResult {
  allowed: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  reasons: string[];
  recommendations: string[];
  requiresAdditionalVerification: boolean;
}

export interface TransactionLimit {
  dailyLimit: number;
  monthlyLimit: number;
  singleTransactionLimit: number;
  requiresKYC: boolean;
  requiresAdditionalAuth: boolean;
}

@Injectable()
export class RiskControlService {
  // Risk thresholds
  private readonly HIGH_RISK_SCORE = 70;
  private readonly MEDIUM_RISK_SCORE = 40;
  private readonly LOW_RISK_SCORE = 20;

  // Transaction limits
  private readonly CREDIT_CARD_DAILY_LIMIT = 5000;
  private readonly CREDIT_CARD_SINGLE_LIMIT = 5000;
  private readonly USDT_DAILY_LIMIT = 100000;
  private readonly USDT_SINGLE_LIMIT = 50000;
  private readonly LARGE_TRANSACTION_THRESHOLD = 10000;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Perform comprehensive risk assessment for a payment
   */
  async assessPaymentRisk(
    userId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      country?: string;
    },
  ): Promise<RiskCheckResult> {
    const reasons: string[] = [];
    let riskScore = 0;
    let requiresAdditionalVerification = false;

    // 1. Check transaction limits
    const limitCheck = this.checkTransactionLimits(amount, paymentMethod);
    if (!limitCheck.allowed) {
      reasons.push(...limitCheck.reasons);
      riskScore += 30;
    }

    // 2. Check user history
    const historyCheck = await this.checkUserHistory(userId, amount);
    if (!historyCheck.allowed) {
      reasons.push(...historyCheck.reasons);
      riskScore += historyCheck.riskScore;
    }

    // 3. Check velocity (frequency of transactions)
    const velocityCheck = await this.checkTransactionVelocity(userId);
    if (!velocityCheck.allowed) {
      reasons.push(...velocityCheck.reasons);
      riskScore += velocityCheck.riskScore;
    }

    // 4. Check geographic risk
    if (metadata?.country) {
      const geoCheck = this.checkGeographicRisk(metadata.country);
      if (!geoCheck.allowed) {
        reasons.push(...geoCheck.reasons);
        riskScore += geoCheck.riskScore;
      }
    }

    // 5. Check payment method specific risks
    const methodCheck = this.checkPaymentMethodRisk(amount, paymentMethod);
    if (!methodCheck.allowed) {
      reasons.push(...methodCheck.reasons);
      riskScore += methodCheck.riskScore;
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore >= this.HIGH_RISK_SCORE) {
      riskLevel = 'critical';
      requiresAdditionalVerification = true;
    } else if (riskScore >= this.MEDIUM_RISK_SCORE) {
      riskLevel = 'high';
      requiresAdditionalVerification = true;
    } else if (riskScore >= this.LOW_RISK_SCORE) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      riskLevel,
      amount,
      paymentMethod,
    );

    return {
      allowed: riskScore < this.HIGH_RISK_SCORE,
      riskLevel,
      riskScore: Math.min(riskScore, 100),
      reasons,
      recommendations,
      requiresAdditionalVerification,
    };
  }

  /**
   * Check transaction limits based on payment method
   */
  checkTransactionLimits(
    amount: number,
    paymentMethod: PaymentMethod,
  ): { allowed: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (paymentMethod === PaymentMethod.CREDIT_CARD) {
      if (amount > this.CREDIT_CARD_SINGLE_LIMIT) {
        reasons.push(
          `Credit card single transaction limit exceeded (${this.CREDIT_CARD_SINGLE_LIMIT} USD)`,
        );
        return { allowed: false, reasons };
      }
    } else if (paymentMethod === PaymentMethod.USDT) {
      if (amount > this.USDT_SINGLE_LIMIT) {
        reasons.push(
          `USDT single transaction limit exceeded (${this.USDT_SINGLE_LIMIT} USD)`,
        );
        return { allowed: false, reasons };
      }
    }

    return { allowed: true, reasons: [] };
  }

  /**
   * Check user's transaction history for risk patterns
   */
  async checkUserHistory(
    userId: string,
    amount: number,
  ): Promise<{ allowed: boolean; reasons: string[]; riskScore: number }> {
    const reasons: string[] = [];
    let riskScore = 0;

    // Get user's completed transactions
    const transactions = await this.prisma.memberTransaction.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Check for new user (no history)
    if (transactions.length === 0) {
      riskScore += 10;
      reasons.push('New user with no transaction history');
    }

    // Check for significantly larger transaction than history
    if (transactions.length > 0) {
      const avgAmount =
        transactions.reduce((sum, tx) => sum + tx.amount, 0) / transactions.length;
      if (amount > avgAmount * 5) {
        riskScore += 20;
        reasons.push(
          `Transaction amount (${amount}) significantly higher than average (${avgAmount.toFixed(2)})`,
        );
      }
    }

    // Check for failed transactions
    const failedCount = await this.prisma.memberTransaction.count({
      where: {
        userId,
        status: 'FAILED',
      },
    });

    if (failedCount > 2) {
      riskScore += 15;
      reasons.push(`User has ${failedCount} failed transactions`);
    }

    return {
      allowed: riskScore < 30,
      reasons,
      riskScore,
    };
  }

  /**
   * Check transaction velocity (frequency)
   */
  async checkTransactionVelocity(
    userId: string,
  ): Promise<{ allowed: boolean; reasons: string[]; riskScore: number }> {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check transactions in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hourlyCount = await this.prisma.memberTransaction.count({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (hourlyCount >= 3) {
      riskScore += 20;
      reasons.push('Multiple transactions in the last hour');
    }

    // Check transactions in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyCount = await this.prisma.memberTransaction.count({
      where: {
        userId,
        createdAt: { gte: oneDayAgo },
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (dailyCount >= 10) {
      riskScore += 15;
      reasons.push('High frequency of transactions in the last 24 hours');
    }

    // Check daily amount
    const dailyAmount = await this.prisma.memberTransaction.aggregate({
      where: {
        userId,
        createdAt: { gte: oneDayAgo },
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    });

    const totalDailyAmount = dailyAmount._sum.amount || 0;
    if (totalDailyAmount > this.USDT_DAILY_LIMIT) {
      riskScore += 25;
      reasons.push('Daily transaction limit exceeded');
    }

    return {
      allowed: riskScore < 30,
      reasons,
      riskScore,
    };
  }

  /**
   * Check geographic risk
   */
  checkGeographicRisk(
    country: string,
  ): { allowed: boolean; reasons: string[]; riskScore: number } {
    const reasons: string[] = [];
    let riskScore = 0;

    // High-risk countries
    const highRiskCountries = ['KP', 'IR', 'SY', 'CU', 'RU'];
    const mediumRiskCountries = ['VN', 'NG', 'PK'];

    if (highRiskCountries.includes(country)) {
      riskScore = 50;
      reasons.push('Transaction from high-risk country');
    } else if (mediumRiskCountries.includes(country)) {
      riskScore = 20;
      reasons.push('Transaction from medium-risk country');
    }

    return {
      allowed: riskScore < 50,
      reasons,
      riskScore,
    };
  }

  /**
   * Check payment method specific risks
   */
  checkPaymentMethodRisk(
    amount: number,
    paymentMethod: PaymentMethod,
  ): { allowed: boolean; reasons: string[]; riskScore: number } {
    const reasons: string[] = [];
    let riskScore = 0;

    // Credit card limit enforcement
    if (paymentMethod === PaymentMethod.CREDIT_CARD) {
      if (amount > this.CREDIT_CARD_SINGLE_LIMIT) {
        riskScore = 100;
        reasons.push(
          `Credit card payments limited to ${this.CREDIT_CARD_SINGLE_LIMIT} USD`,
        );
      } else if (amount > this.CREDIT_CARD_SINGLE_LIMIT * 0.8) {
        riskScore = 10;
        reasons.push('Transaction approaching credit card limit');
      }
    }

    // Large transaction warning
    if (amount >= this.LARGE_TRANSACTION_THRESHOLD) {
      riskScore += 10;
      reasons.push('Large transaction requires additional verification');
    }

    return {
      allowed: riskScore < 100,
      reasons,
      riskScore,
    };
  }

  /**
   * Generate recommendations based on risk assessment
   */
  generateRecommendations(
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    amount: number,
    paymentMethod: PaymentMethod,
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push('Manual review required before processing');
      recommendations.push('Contact customer support for large transactions');
    }

    if (amount > this.CREDIT_CARD_SINGLE_LIMIT && paymentMethod === PaymentMethod.CREDIT_CARD) {
      recommendations.push('Use USDT or other cryptocurrency for amounts over $5,000');
    }

    if (riskLevel === 'medium') {
      recommendations.push('Enable two-factor authentication');
    }

    return recommendations;
  }

  /**
   * Get transaction limits for a user
   */
  async getTransactionLimits(userId: string): Promise<TransactionLimit> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Check if user is verified
    const isVerified = user?.isVerified || false;

    return {
      dailyLimit: isVerified ? this.USDT_DAILY_LIMIT : 5000,
      monthlyLimit: isVerified ? 500000 : 20000,
      singleTransactionLimit: isVerified ? this.USDT_SINGLE_LIMIT : this.CREDIT_CARD_SINGLE_LIMIT,
      requiresKYC: !isVerified,
      requiresAdditionalAuth: !isVerified,
    };
  }

  /**
   * Log risk event for audit
   */
  async logRiskEvent(
    userId: string,
    eventType: string,
    details: {
      amount?: number;
      paymentMethod?: PaymentMethod;
      riskScore?: number;
      riskLevel?: string;
      decision?: string;
    },
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: `RISK_${eventType}`,
        resource: 'payment',
        details: {
          ...details,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Block user payment due to suspicious activity
   */
  async blockUserPayments(userId: string, reason: string) {
    await this.prisma.systemConfig.upsert({
      where: { key: `payment_block_${userId}` },
      create: {
        key: `payment_block_${userId}`,
        value: {
          blocked: true,
          reason,
          blockedAt: new Date().toISOString(),
        },
        description: 'Payment block record',
      },
      update: {
        value: {
          blocked: true,
          reason,
          blockedAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Check if user payments are blocked
   */
  async isUserBlocked(userId: string): Promise<{ blocked: boolean; reason?: string }> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: `payment_block_${userId}` },
    });

    if (!config) {
      return { blocked: false };
    }

    const data = config.value as any;
    return {
      blocked: data.blocked || false,
      reason: data.reason,
    };
  }
}