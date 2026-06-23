import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/services/prisma.service';

export interface AmlCheckResult {
  allowed: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  flags: string[];
  requiresManualReview: boolean;
  watchlistMatch: boolean;
  transactionPattern: 'normal' | 'suspicious' | 'high_risk';
}

export interface UserAmlStatus {
  userId: string;
  riskLevel: 'low' | 'medium' | 'high';
  lastCheckAt: Date;
  flags: string[];
  watchlistStatus: 'clear' | 'review' | 'flagged';
  totalTransactions: number;
  totalVolume: number;
}

/**
 * AML (Anti-Money Laundering) Monitoring Service
 * 
 * Implements AML compliance:
 * - Transaction monitoring
 * - Watchlist screening
 * - Suspicious activity detection
 * - Geographic risk assessment
 * 
 * Requirements: 10.3, 10.4
 */
@Injectable()
export class AmlMonitoringService {
  private readonly logger = new Logger(AmlMonitoringService.name);

  // High-risk countries for AML
  private readonly HIGH_RISK_COUNTRIES = ['KP', 'IR', 'SY', 'CU', 'BY', 'MM'];
  private readonly MEDIUM_RISK_COUNTRIES = ['VN', 'NG', 'PK', 'KH', 'LA'];
  
  // Watchlist (simplified - in production, integrate with Chainalysis)
  private readonly WATCHLIST: Set<string> = new Set();

  // Suspicious transaction patterns
  private readonly SUSPICIOUS_PATTERNS = {
    rapidMovement: 5, // transactions per hour threshold
    largeTransaction: 10000, // USD threshold
    structuringThreshold: 9000, // just under reporting threshold
  };

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Perform AML check for a transaction
   */
  async performAmlCheck(
    userId: string,
    amount: number,
    country?: string,
    ipAddress?: string,
  ): Promise<AmlCheckResult> {
    this.logger.log(`Performing AML check for user ${userId}, amount: ${amount}`);

    const flags: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let requiresManualReview = false;
    let watchlistMatch = false;
    let transactionPattern: 'normal' | 'suspicious' | 'high_risk' = 'normal';

    // 1. Check watchlist
    const watchlistCheck = await this.checkWatchlist(userId);
    if (watchlistCheck.found) {
      flags.push('User on watchlist');
      watchlistMatch = true;
      riskLevel = 'high';
      requiresManualReview = true;
    }

    // 2. Check geographic risk
    if (country) {
      const geoCheck = this.checkGeographicRisk(country);
      if (geoCheck.riskLevel !== 'low') {
        flags.push(...geoCheck.flags);
        if (geoCheck.riskLevel === 'high') {
          riskLevel = 'high';
          requiresManualReview = true;
        } else if (geoCheck.riskLevel === 'medium' && riskLevel === 'low') {
          riskLevel = 'medium';
        }
      }
    }

    // 3. Check transaction patterns
    const patternCheck = await this.checkTransactionPattern(userId, amount);
    if (patternCheck.pattern !== 'normal') {
      flags.push(...patternCheck.flags);
      transactionPattern = patternCheck.pattern;
      if (patternCheck.pattern === 'high_risk') {
        riskLevel = 'high';
        requiresManualReview = true;
      } else if (patternCheck.pattern === 'suspicious' && riskLevel === 'low') {
        riskLevel = 'medium';
      }
    }

    // 4. Check for structuring (smurfing)
    if (amount >= this.SUSPICIOUS_PATTERNS.structuringThreshold && 
        amount < this.SUSPICIOUS_PATTERNS.largeTransaction) {
      flags.push('Transaction amount near reporting threshold - potential structuring');
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    // 5. Large transaction check
    if (amount >= this.SUSPICIOUS_PATTERNS.largeTransaction) {
      flags.push('Large transaction requires additional verification');
      requiresManualReview = true;
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    // 6. IP address analysis
    if (ipAddress) {
      const ipCheck = this.analyzeIpAddress(ipAddress);
      if (ipCheck.flag) {
        flags.push(ipCheck.flag);
        if (ipCheck.highRisk) {
          riskLevel = 'high';
          requiresManualReview = true;
        }
      }
    }

    // Log AML check
    await this.logAmlCheck(userId, {
      amount,
      country,
      riskLevel,
      flags,
      requiresManualReview,
      transactionPattern,
    });

    return {
      allowed: riskLevel !== 'high',
      riskLevel,
      flags,
      requiresManualReview,
      watchlistMatch,
      transactionPattern,
    };
  }

  /**
   * Check if user is on watchlist
   */
  private async checkWatchlist(userId: string): Promise<{ found: boolean; reason?: string }> {
    // Check against internal watchlist
    if (this.WATCHLIST.has(userId)) {
      return { found: true, reason: 'Internal watchlist' };
    }

    // Check database for flagged users
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isVerified: true, createdAt: true },
    });

    // Additional watchlist checks can be integrated here
    // In production, integrate with Chainalysis or similar

    return { found: false };
  }

  /**
   * Check geographic risk
   */
  private checkGeographicRisk(country: string): {
    riskLevel: 'low' | 'medium' | 'high';
    flags: string[];
  } {
    const flags: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    if (this.HIGH_RISK_COUNTRIES.includes(country)) {
      riskLevel = 'high';
      flags.push(`High-risk country: ${country}`);
    } else if (this.MEDIUM_RISK_COUNTRIES.includes(country)) {
      riskLevel = 'medium';
      flags.push(`Medium-risk country: ${country}`);
    }

    return { riskLevel, flags };
  }

  /**
   * Check transaction patterns for suspicious activity
   */
  private async checkTransactionPattern(
    userId: string,
    amount: number,
  ): Promise<{
    pattern: 'normal' | 'suspicious' | 'high_risk';
    flags: string[];
  }> {
    const flags: string[] = [];
    let pattern: 'normal' | 'suspicious' | 'high_risk' = 'normal';

    // Check transaction velocity (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hourlyCount = await this.prisma.memberTransaction.count({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (hourlyCount >= this.SUSPICIOUS_PATTERNS.rapidMovement) {
      pattern = 'suspicious';
      flags.push('High transaction velocity detected');
    }

    // Check for round-trip transactions (potential money laundering)
    const recentTransactions = await this.prisma.memberTransaction.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (recentTransactions.length >= 3) {
      const amounts = recentTransactions.map(t => t.amount);
      const uniqueAmounts = new Set(amounts);
      if (amounts.length === uniqueAmounts.size) {
        // All different amounts - could be structuring
        pattern = 'suspicious';
        flags.push('Multiple transactions with varying amounts');
      }
    }

    return { pattern, flags };
  }

  /**
   * Analyze IP address for risk
   */
  private analyzeIpAddress(ipAddress: string): { flag?: string; highRisk: boolean } {
    // Check for VPN/proxy indicators (simplified)
    // In production, integrate with IP geolocation service
    
    // Check for private/reserved IP ranges
    if (ipAddress.startsWith('10.') || 
        ipAddress.startsWith('192.168.') ||
        ipAddress.startsWith('172.16.')) {
      return { flag: 'Private IP address detected', highRisk: false };
    }

    return { highRisk: false };
  }

  /**
   * Log AML check for audit
   */
  private async logAmlCheck(
    userId: string,
    data: {
      amount: number;
      country?: string;
      riskLevel: string;
      flags: string[];
      requiresManualReview: boolean;
      transactionPattern: string;
    },
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'AML_CHECK',
          resource: 'compliance',
          details: {
            ...data,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to log AML check', error);
    }
  }

  /**
   * Get user AML status
   */
  async getUserAmlStatus(userId: string): Promise<UserAmlStatus> {
    const transactions = await this.prisma.memberTransaction.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
    });

    const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    // Determine risk level based on history
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    const flags: string[] = [];

    if (transactions.length > 20) {
      riskLevel = 'medium';
      flags.push('High transaction volume');
    }

    if (totalVolume > 100000) {
      riskLevel = 'high';
      flags.push('High transaction value');
    }

    return {
      userId,
      riskLevel,
      lastCheckAt: new Date(),
      flags,
      watchlistStatus: this.WATCHLIST.has(userId) ? 'flagged' : 'clear',
      totalTransactions: transactions.length,
      totalVolume,
    };
  }

  /**
   * Add user to watchlist
   */
  async addToWatchlist(userId: string, reason: string) {
    this.WATCHLIST.add(userId);
    
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'WATCHLIST_ADD',
        resource: 'compliance',
        details: {
          reason,
          timestamp: new Date().toISOString(),
        },
      },
    });

    this.logger.warn(`User ${userId} added to watchlist: ${reason}`);
  }

  /**
   * Remove user from watchlist
   */
  async removeFromWatchlist(userId: string, reason: string) {
    this.WATCHLIST.delete(userId);
    
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'WATCHLIST_REMOVE',
        resource: 'compliance',
        details: {
          reason,
          timestamp: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`User ${userId} removed from watchlist: ${reason}`);
  }

  /**
   * Get all flagged transactions for review
   */
  async getFlaggedTransactions(startDate: Date, endDate: Date) {
    const flaggedLogs = await this.prisma.auditLog.findMany({
      where: {
        action: 'AML_CHECK',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return flaggedLogs
      .filter(log => {
        const details = log.details as any;
        return details.riskLevel === 'high' || details.requiresManualReview;
      })
      .map(log => ({
        userId: log.userId,
        timestamp: log.createdAt,
        details: log.details,
      }));
  }
}