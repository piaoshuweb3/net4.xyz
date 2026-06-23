import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/services/prisma.service';

export interface RefundRiskResult {
  allowed: boolean;
  refundEligibility: boolean;
  riskScore: number;
  reasons: string[];
  refundWindowDays: number;
  refundableAmount: number;
  nonRefundableReasons: string[];
}

export interface UserRefundStatus {
  userId: string;
  totalRefunds: number;
  refundRate: number;
  refundRiskLevel: 'low' | 'medium' | 'high';
  isBlocked: boolean;
  blockReason?: string;
}

/**
 * Refund Risk Control Service
 * 
 * Implements refund risk control:
 * - NFT purchases have 90-day lockup (non-refundable)
 * - Credit card purchases limited to "wrapped" version
 * - Track refund history for risk assessment
 * - Block users with excessive refunds
 * 
 * Requirements: 10.2
 */
@Injectable()
export class RefundRiskControlService {
  private readonly logger = new Logger(RefundRiskControlService.name);

  // Refund configuration
  private readonly NFT_LOCKUP_DAYS = 90;
  private readonly SERVICE_REFUND_DAYS = 7;
  private readonly MAX_REFUND_RATE = 0.3; // 30% refund rate threshold
  private readonly MAX_REFUNDS_PER_YEAR = 3;

  // Risk thresholds
  private readonly HIGH_RISK_SCORE = 70;
  private readonly MEDIUM_RISK_SCORE = 40;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Assess refund risk for a transaction
   */
  async assessRefundRisk(
    userId: string,
    productType: 'nft' | 'service' | 'token',
    amount: number,
  ): Promise<RefundRiskResult> {
    this.logger.log(`Assessing refund risk for user ${userId}, product type: ${productType}`);

    const reasons: string[] = [];
    const nonRefundableReasons: string[] = [];
    let riskScore = 0;
    let refundEligibility = true;
    let refundWindowDays: number;

    // 1. Check product-specific refund rules
    if (productType === 'nft') {
      // NFT purchases are locked for 90 days
      refundWindowDays = this.NFT_LOCKUP_DAYS;
      refundEligibility = false;
      nonRefundableReasons.push(
        'NFT purchases are locked for 90 days to prevent market manipulation',
        'NFT represents network participation right, not a tradeable security',
      );
      reasons.push('NFT purchases are non-refundable during lockup period');
    } else if (productType === 'service') {
      // Service refunds within 7 days
      refundWindowDays = this.SERVICE_REFUND_DAYS;
      reasons.push('Service refund available within 7 days of purchase');
    } else {
      // Token - generally non-refundable
      refundWindowDays = 0;
      refundEligibility = false;
      nonRefundableReasons.push('Token purchases are final');
      reasons.push('Token purchases are non-refundable');
    }

    // 2. Check user's refund history
    const userRefundStatus = await this.getUserRefundStatus(userId);
    if (userRefundStatus.isBlocked) {
      riskScore = 100;
      reasons.push(`User blocked from purchases: ${userRefundStatus.blockReason}`);
      refundEligibility = false;
    } else if (userRefundStatus.refundRiskLevel === 'high') {
      riskScore += 50;
      reasons.push('User has high refund rate');
    } else if (userRefundStatus.refundRiskLevel === 'medium') {
      riskScore += 25;
      reasons.push('User has moderate refund rate');
    }

    // 3. Check for credit card payment restrictions
    // Credit card purchases for NFTs are "wrapped" version (locked)
    if (productType === 'nft') {
      // Wrapped NFT - locked for longer
      refundWindowDays = 90;
      reasons.push('Credit card purchases are limited to wrapped version (90-day lock)');
    }

    // 4. Calculate refundable amount
    let refundableAmount = 0;
    if (refundEligibility && productType === 'service') {
      // Service can be partially refunded based on time
      refundableAmount = amount; // Full refund within window
    }

    // Determine if allowed
    const allowed = riskScore < this.HIGH_RISK_SCORE;

    // Log refund risk assessment
    await this.logRefundRiskAssessment(userId, {
      productType,
      amount,
      riskScore,
      refundEligibility,
      allowed,
    });

    return {
      allowed,
      refundEligibility,
      riskScore: Math.min(riskScore, 100),
      reasons,
      refundWindowDays,
      refundableAmount,
      nonRefundableReasons,
    };
  }

  /**
   * Process refund request
   */
  async processRefund(
    userId: string,
    transactionId: string,
    reason?: string,
  ): Promise<{ success: boolean; refundAmount: number; message: string }> {
    this.logger.log(`Processing refund for user ${userId}, transaction ${transactionId}`);

    // Get transaction
    const transaction = await this.prisma.memberTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return { success: false, refundAmount: 0, message: 'Transaction not found' };
    }

    if (transaction.userId !== userId) {
      return { success: false, refundAmount: 0, message: 'Transaction does not belong to user' };
    }

    // Check refund eligibility
    const refundCheck = await this.assessRefundRisk(userId, transaction.level as any, transaction.amount);
    if (!refundCheck.refundEligibility) {
      return { 
        success: false, 
        refundAmount: 0, 
        message: `Refund not available: ${refundCheck.nonRefundableReasons.join(', ')}` 
      };
    }

    // Check if within refund window
    const daysSincePurchase = Math.floor(
      (Date.now() - transaction.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSincePurchase > refundCheck.refundWindowDays) {
      return { 
        success: false, 
        refundAmount: 0, 
        message: `Refund window expired (${daysSincePurchase} days > ${refundCheck.refundWindowDays} days)` 
      };
    }

    // Calculate refund amount (simple - full refund within window)
    const refundAmount = transaction.amount;

    // Update transaction status
    await this.prisma.memberTransaction.update({
      where: { id: transactionId },
      data: { status: 'REFUNDED' },
    });

    // Log refund
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'REFUND_PROCESSED',
        resource: 'payment',
        details: {
          transactionId,
          refundAmount,
          reason,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return { success: true, refundAmount, message: 'Refund processed successfully' };
  }

  /**
   * Get user refund status
   */
  async getUserRefundStatus(userId: string): Promise<UserRefundStatus> {
    // Get all transactions
    const allTransactions = await this.prisma.memberTransaction.findMany({
      where: { userId },
    });

    const completedTransactions = allTransactions.filter(t => t.status === 'COMPLETED');
    const refundedTransactions = allTransactions.filter(t => t.status === 'REFUNDED');

    const totalRefunds = refundedTransactions.length;
    const totalCompleted = completedTransactions.length;

    // Calculate refund rate
    const refundRate = totalCompleted > 0 ? totalRefunds / totalCompleted : 0;

    // Determine risk level
    let refundRiskLevel: 'low' | 'medium' | 'high' = 'low';
    if (refundRate > this.MAX_REFUND_RATE) {
      refundRiskLevel = 'high';
    } else if (refundRate > 0.15) {
      refundRiskLevel = 'medium';
    }

    // Check if blocked
    const blockedConfig = await this.prisma.systemConfig.findUnique({
      where: { key: `refund_block_${userId}` },
    });

    const isBlocked = blockedConfig?.value?.['blocked'] || false;
    const blockReason = blockedConfig?.value?.['reason'];

    return {
      userId,
      totalRefunds,
      refundRate,
      refundRiskLevel,
      isBlocked,
      blockReason,
    };
  }

  /**
   * Block user from refunds
   */
  async blockUserRefunds(userId: string, reason: string) {
    await this.prisma.systemConfig.upsert({
      where: { key: `refund_block_${userId}` },
      create: {
        key: `refund_block_${userId}`,
        value: {
          blocked: true,
          reason,
          blockedAt: new Date().toISOString(),
        },
        description: 'Refund block record',
      },
      update: {
        value: {
          blocked: true,
          reason,
          blockedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.warn(`User ${userId} blocked from refunds: ${reason}`);
  }

  /**
   * Unblock user from refunds
   */
  async unblockUserRefunds(userId: string) {
    await this.prisma.systemConfig.update({
      where: { key: `refund_block_${userId}` },
      data: {
        value: {
          blocked: false,
          unblockedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`User ${userId} unblocked from refunds`);
  }

  /**
   * Log refund risk assessment
   */
  private async logRefundRiskAssessment(
    userId: string,
    data: {
      productType: string;
      amount: number;
      riskScore: number;
      refundEligibility: boolean;
      allowed: boolean;
    },
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'REFUND_RISK_CHECK',
          resource: 'compliance',
          details: {
            ...data,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to log refund risk assessment', error);
    }
  }

  /**
   * Get refund statistics for reporting
   */
  async getRefundStatistics(startDate: Date, endDate: Date) {
    const transactions = await this.prisma.memberTransaction.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ['COMPLETED', 'REFUNDED'] },
      },
    });

    const completed = transactions.filter(t => t.status === 'COMPLETED');
    const refunded = transactions.filter(t => t.status === 'REFUNDED');

    const totalAmount = completed.reduce((sum, t) => sum + t.amount, 0);
    const refundedAmount = refunded.reduce((sum, t) => sum + t.amount, 0);

    return {
      period: { startDate, endDate },
      totalTransactions: transactions.length,
      completedTransactions: completed.length,
      refundedTransactions: refunded.length,
      refundRate: completed.length > 0 ? refunded.length / completed.length : 0,
      totalVolume: totalAmount,
      refundedVolume: refundedAmount,
      refundRatio: totalAmount > 0 ? refundedAmount / totalAmount : 0,
    };
  }
}