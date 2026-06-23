import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/services/prisma.service';

export interface ComplianceReport {
  reportId: string;
  reportType: 'monthly' | 'quarterly' | 'annual';
  period: {
    startDate: Date;
    endDate: Date;
  };
  generatedAt: Date;
  summary: {
    totalTransactions: number;
    totalVolume: number;
    complianceRate: number;
    highRiskTransactions: number;
    flaggedTransactions: number;
  };
  amlReport: AmlReportSection;
  refundReport: RefundReportSection;
  securitiesReport: SecuritiesReportSection;
  riskMetrics: RiskMetrics;
}

export interface AmlReportSection {
  totalChecks: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  watchlistHits: number;
  suspiciousPatterns: number;
  manualReviewsRequired: number;
  topFlags: string[];
}

export interface RefundReportSection {
  totalRefunds: number;
  refundRate: number;
  totalRefundedAmount: number;
  blockedUsers: number;
  topRefundReasons: string[];
}

export interface SecuritiesReportSection {
  totalProductSales: number;
  nftSales: number;
  serviceSales: number;
  tokenSales: number;
  complianceAlerts: string[];
}

export interface RiskMetrics {
  averageRiskScore: number;
  riskTrend: 'increasing' | 'stable' | 'decreasing';
  topRiskFactors: string[];
  recommendations: string[];
}

/**
 * Compliance Report Service
 * 
 * Generates compliance reports:
 * - AML monitoring summary
 * - Refund risk analysis
 * - Securities compliance status
 * - Risk metrics and recommendations
 * 
 * Requirements: 10.4
 */
@Injectable()
export class ComplianceReportService {
  private readonly logger = new Logger(ComplianceReportService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Generate compliance report for a period
   */
  async generateReport(
    startDate: Date,
    endDate: Date,
    reportType: 'monthly' | 'quarterly' | 'annual' = 'monthly',
  ): Promise<ComplianceReport> {
    this.logger.log(`Generating ${reportType} compliance report for ${startDate} to ${endDate}`);

    const reportId = `COMP-${reportType.toUpperCase()}-${Date.now()}`;

    // Get transaction data
    const transactions = await this.prisma.memberTransaction.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ['COMPLETED', 'FAILED', 'REFUNDED'] },
      },
    });

    // Get AML check data
    const amlLogs = await this.prisma.auditLog.findMany({
      where: {
        action: 'AML_CHECK',
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Get refund data
    const refundLogs = await this.prisma.auditLog.findMany({
      where: {
        action: { in: ['REFUND_PROCESSED', 'REFUND_RISK_CHECK'] },
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Get securities compliance data
    const securitiesLogs = await this.prisma.auditLog.findMany({
      where: {
        action: 'COMPLIANCE_CHECK',
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Calculate summary
    const totalTransactions = transactions.length;
    const totalVolume = transactions
      .filter(t => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + t.amount, 0);

    const highRiskTransactions = amlLogs.filter(log => {
      const details = log.details as any;
      return details.riskLevel === 'high';
    }).length;

    const flaggedTransactions = amlLogs.filter(log => {
      const details = log.details as any;
      return details.requiresManualReview;
    }).length;

    const complianceRate = totalTransactions > 0 
      ? ((totalTransactions - highRiskTransactions) / totalTransactions) * 100 
      : 100;

    // Generate AML report section
    const amlReport = this.generateAmlReport(amlLogs);

    // Generate refund report section
    const refundReport = await this.generateRefundReport(refundLogs, transactions);

    // Generate securities report section
    const securitiesReport = this.generateSecuritiesReport(transactions, securitiesLogs);

    // Generate risk metrics
    const riskMetrics = this.generateRiskMetrics(amlLogs, refundLogs, transactions);

    return {
      reportId,
      reportType,
      period: { startDate, endDate },
      generatedAt: new Date(),
      summary: {
        totalTransactions,
        totalVolume,
        complianceRate,
        highRiskTransactions,
        flaggedTransactions,
      },
      amlReport,
      refundReport,
      securitiesReport,
      riskMetrics,
    };
  }

  /**
   * Generate AML report section
   */
  private generateAmlReport(amlLogs: any[]): AmlReportSection {
    const highRiskCount = amlLogs.filter(log => {
      const details = log.details as any;
      return details.riskLevel === 'high';
    }).length;

    const mediumRiskCount = amlLogs.filter(log => {
      const details = log.details as any;
      return details.riskLevel === 'medium';
    }).length;

    const lowRiskCount = amlLogs.filter(log => {
      const details = log.details as any;
      return details.riskLevel === 'low';
    }).length;

    // Count flags
    const flagCounts = new Map<string, number>();
    amlLogs.forEach(log => {
      const details = log.details as any;
      if (details.flags) {
        details.flags.forEach((flag: string) => {
          flagCounts.set(flag, (flagCounts.get(flag) || 0) + 1);
        });
      }
    });

    const topFlags = Array.from(flagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([flag]) => flag);

    const watchlistHits = amlLogs.filter(log => {
      const details = log.details as any;
      return details.watchlistMatch;
    }).length;

    const suspiciousPatterns = amlLogs.filter(log => {
      const details = log.details as any;
      return details.transactionPattern === 'suspicious' || details.transactionPattern === 'high_risk';
    }).length;

    const manualReviewsRequired = amlLogs.filter(log => {
      const details = log.details as any;
      return details.requiresManualReview;
    }).length;

    return {
      totalChecks: amlLogs.length,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      watchlistHits,
      suspiciousPatterns,
      manualReviewsRequired,
      topFlags,
    };
  }

  /**
   * Generate refund report section
   */
  private async generateRefundReport(refundLogs: any[], transactions: any[]): Promise<RefundReportSection> {
    const refundedTransactions = transactions.filter(t => t.status === 'REFUNDED');
    const completedTransactions = transactions.filter(t => t.status === 'COMPLETED');

    const totalRefunds = refundedTransactions.length;
    const refundRate = completedTransactions.length > 0 
      ? refundedTransactions.length / completedTransactions.length 
      : 0;

    const totalRefundedAmount = refundedTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Count blocked users
    const blockedConfigs = await this.prisma.systemConfig.findMany({
      where: {
        key: { startsWith: 'refund_block_' },
      },
    });

    const blockedUsers = blockedConfigs.filter(c => c.value?.['blocked']).length;

    // Top refund reasons (simplified)
    const topRefundReasons = [
      'Changed mind',
      'Duplicate charge',
      'Service not as described',
      'Technical issues',
      'Other',
    ];

    return {
      totalRefunds,
      refundRate: refundRate * 100,
      totalRefundedAmount,
      blockedUsers,
      topRefundReasons,
    };
  }

  /**
   * Generate securities report section
   */
  private generateSecuritiesReport(
    transactions: any[],
    securitiesLogs: any[],
  ): SecuritiesReportSection {
    const nftSales = transactions.filter(t => 
      t.status === 'COMPLETED' && t.level === 'SUB'
    ).length;

    const serviceSales = transactions.filter(t => 
      t.status === 'COMPLETED' && (t.level === 'BASIC' || t.level === 'MEDIUM')
    ).length;

    const tokenSales = 0; // Token sales not implemented yet

    const complianceAlerts: string[] = [];

    // Check for compliance issues
    securitiesLogs.forEach(log => {
      const details = log.details as any;
      if (details.securitiesCheck?.warnings?.length > 0) {
        details.securitiesCheck.warnings.forEach((warning: string) => {
          if (!complianceAlerts.includes(warning)) {
            complianceAlerts.push(warning);
          }
        });
      }
    });

    return {
      totalProductSales: transactions.filter(t => t.status === 'COMPLETED').length,
      nftSales,
      serviceSales,
      tokenSales,
      complianceAlerts: complianceAlerts.slice(0, 10),
    };
  }

  /**
   * Generate risk metrics
   */
  private generateRiskMetrics(
    amlLogs: any[],
    refundLogs: any[],
    transactions: any[],
  ): RiskMetrics {
    // Calculate average risk score
    const riskScores = amlLogs
      .map(log => (log.details as any)?.riskScore)
      .filter(score => score !== undefined);

    const averageRiskScore = riskScores.length > 0
      ? riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length
      : 0;

    // Determine risk trend (simplified - compare first half to second half)
    const midPoint = Math.floor(amlLogs.length / 2);
    const firstHalfScores = amlLogs.slice(0, midPoint).map(l => (l.details as any)?.riskScore || 0);
    const secondHalfScores = amlLogs.slice(midPoint).map(l => (l.details as any)?.riskScore || 0);

    const firstHalfAvg = firstHalfScores.length > 0
      ? firstHalfScores.reduce((a, b) => a + b, 0) / firstHalfScores.length
      : 0;
    const secondHalfAvg = secondHalfScores.length > 0
      ? secondHalfScores.reduce((a, b) => a + b, 0) / secondHalfScores.length
      : 0;

    let riskTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (secondHalfAvg > firstHalfAvg * 1.2) {
      riskTrend = 'increasing';
    } else if (secondHalfAvg < firstHalfAvg * 0.8) {
      riskTrend = 'decreasing';
    }

    // Top risk factors
    const topRiskFactors = [
      'High-value transactions',
      'New user activity',
      'Geographic risk',
      'Transaction velocity',
    ];

    // Recommendations
    const recommendations: string[] = [];
    if (averageRiskScore > 40) {
      recommendations.push('Consider implementing additional verification for high-risk transactions');
    }
    if (riskTrend === 'increasing') {
      recommendations.push('Risk levels are trending up - review current risk assessment criteria');
    }
    recommendations.push('Continue monitoring watchlist and suspicious activity patterns');
    recommendations.push('Maintain compliance with evolving regulatory requirements');

    return {
      averageRiskScore: Math.round(averageRiskScore * 100) / 100,
      riskTrend,
      topRiskFactors,
      recommendations,
    };
  }

  /**
   * Export report to CSV format
   */
  async exportReportToCsv(report: ComplianceReport): Promise<string> {
    const lines: string[] = [];

    // Header
    lines.push('Compliance Report');
    lines.push(`Report ID: ${report.reportId}`);
    lines.push(`Type: ${report.reportType}`);
    lines.push(`Period: ${report.period.startDate.toISOString()} to ${report.period.endDate.toISOString()}`);
    lines.push(`Generated: ${report.generatedAt.toISOString()}`);
    lines.push('');

    // Summary
    lines.push('Summary');
    lines.push(`Total Transactions,${report.summary.totalTransactions}`);
    lines.push(`Total Volume,${report.summary.totalVolume}`);
    lines.push(`Compliance Rate,${report.summary.complianceRate.toFixed(2)}%`);
    lines.push(`High Risk Transactions,${report.summary.highRiskTransactions}`);
    lines.push(`Flagged Transactions,${report.summary.flaggedTransactions}`);
    lines.push('');

    // AML Section
    lines.push('AML Monitoring');
    lines.push(`Total Checks,${report.amlReport.totalChecks}`);
    lines.push(`High Risk,${report.amlReport.highRiskCount}`);
    lines.push(`Medium Risk,${report.amlReport.mediumRiskCount}`);
    lines.push(`Low Risk,${report.amlReport.lowRiskCount}`);
    lines.push(`Watchlist Hits,${report.amlReport.watchlistHits}`);
    lines.push(`Manual Reviews Required,${report.amlReport.manualReviewsRequired}`);
    lines.push('');

    // Refund Section
    lines.push('Refund Analysis');
    lines.push(`Total Refunds,${report.refundReport.totalRefunds}`);
    lines.push(`Refund Rate,${report.refundReport.refundRate.toFixed(2)}%`);
    lines.push(`Total Refunded Amount,${report.refundReport.totalRefundedAmount}`);
    lines.push(`Blocked Users,${report.refundReport.blockedUsers}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Get recent compliance alerts
   */
  async getRecentAlerts(days: number = 7): Promise<any[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const alerts = await this.prisma.auditLog.findMany({
      where: {
        action: { in: ['AML_CHECK', 'COMPLIANCE_CHECK', 'WATCHLIST_ADD'] },
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return alerts
      .filter(log => {
        const details = log.details as any;
        return details.riskLevel === 'high' || details.requiresManualReview || details.blocked;
      })
      .map(log => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        timestamp: log.createdAt,
        details: log.details,
      }));
  }
}