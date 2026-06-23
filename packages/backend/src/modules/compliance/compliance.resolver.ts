import { Resolver, Query, Mutation, Args, Int, ObjectType, Field } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { SecuritiesAvoidanceService } from './securities-avoidance.service';
import { AmlMonitoringService } from './aml-monitoring.service';
import { RefundRiskControlService } from './refund-risk-control.service';
import { ComplianceReportService } from './compliance-report.service';
import { JwtAuthGuard } from '../gateway/guards/jwt-auth.guard';
import { RolesGuard } from '../gateway/guards/roles.guard';
import { Roles } from '../gateway/decorators/roles.decorator';
import { ComplianceCheckResultDto } from './dto/compliance-check-result.dto';
import { ComplianceReportDto } from './dto/compliance-report.dto';

@ObjectType()
class RefundResult {
  @Field()
  success: boolean;

  @Field()
  refundAmount: number;

  @Field()
  message: string;
}

@Resolver()
export class ComplianceResolver {
  constructor(
    private complianceService: ComplianceService,
    private securitiesAvoidance: SecuritiesAvoidanceService,
    private amlMonitoring: AmlMonitoringService,
    private refundRiskControl: RefundRiskControlService,
    private complianceReportService: ComplianceReportService,
  ) {}

  /**
   * Perform comprehensive compliance check
   */
  @Query(() => ComplianceCheckResultDto)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COMPLIANCE_OFFICER')
  async complianceCheck(
    @Args('userId') userId: string,
    @Args('productType') productType: 'nft' | 'service' | 'token',
    @Args('amount', { type: () => Int }) amount: number,
    @Args('country', { nullable: true }) country?: string,
    @Args('ipAddress', { nullable: true }) ipAddress?: string,
    @Args('paymentMethod', { nullable: true }) paymentMethod?: string,
  ): Promise<any> {
    return this.complianceService.performComplianceCheck(
      userId,
      productType,
      amount,
      { country, ipAddress, paymentMethod },
    );
  }

  /**
   * Get user compliance status
   */
  @Query(() => String)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COMPLIANCE_OFFICER')
  async userComplianceStatus(@Args('userId') userId: string) {
    return this.complianceService.getUserComplianceStatus(userId);
  }

  /**
   * Get compliant messaging for a product type
   */
  @Query(() => [String])
  compliantMessaging(@Args('productType') productType: 'nft' | 'service' | 'token') {
    return this.securitiesAvoidance.getCompliantMessaging(productType);
  }

  /**
   * Validate product description for securities violations
   */
  @Query(() => String)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CONTENT_MANAGER')
  async validateProductDescription(@Args('description') description: string) {
    return this.securitiesAvoidance.validateProductDescription(description);
  }

  /**
   * Get user AML status
   */
  @Query(() => String)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COMPLIANCE_OFFICER')
  async userAmlStatus(@Args('userId') userId: string) {
    return this.amlMonitoring.getUserAmlStatus(userId);
  }

  /**
   * Add user to AML watchlist
   */
  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COMPLIANCE_OFFICER')
  async addToWatchlist(
    @Args('userId') userId: string,
    @Args('reason') reason: string,
  ) {
    await this.amlMonitoring.addToWatchlist(userId, reason);
    return true;
  }

  /**
   * Remove user from AML watchlist
   */
  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COMPLIANCE_OFFICER')
  async removeFromWatchlist(
    @Args('userId') userId: string,
    @Args('reason') reason: string,
  ) {
    await this.amlMonitoring.removeFromWatchlist(userId, reason);
    return true;
  }

  /**
   * Get user refund status
   */
  @Query(() => String)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COMPLIANCE_OFFICER')
  async userRefundStatus(@Args('userId') userId: string) {
    return this.refundRiskControl.getUserRefundStatus(userId);
  }

  /**
   * Process refund request
   */
  @Mutation(() => RefundResult)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'FINANCE')
  async processRefund(
    @Args('userId') userId: string,
    @Args('transactionId') transactionId: string,
    @Args('reason', { nullable: true }) reason?: string,
  ) {
    return this.refundRiskControl.processRefund(userId, transactionId, reason);
  }

  /**
   * Block user from refunds
   */
  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COMPLIANCE_OFFICER')
  async blockUserRefunds(
    @Args('userId') userId: string,
    @Args('reason') reason: string,
  ) {
    await this.refundRiskControl.blockUserRefunds(userId, reason);
    return true;
  }

  /**
   * Unblock user from refunds
   */
  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COMPLIANCE_OFFICER')
  async unblockUserRefunds(@Args('userId') userId: string) {
    await this.refundRiskControl.unblockUserRefunds(userId);
    return true;
  }

  /**
   * Generate compliance report
   */
  @Query(() => ComplianceReportDto)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COMPLIANCE_OFFICER')
  async complianceReport(
    @Args('startDate') startDate: Date,
    @Args('endDate') endDate: Date,
    @Args('reportType', { nullable: true }) reportType: 'monthly' | 'quarterly' | 'annual' = 'monthly',
  ): Promise<ComplianceReportDto> {
    return this.complianceService.generateComplianceReport(startDate, endDate, reportType);
  }

  /**
   * Get recent compliance alerts
   */
  @Query(() => [Object])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COMPLIANCE_OFFICER')
  async recentComplianceAlerts(@Args('days', { type: () => Int, nullable: true }) days?: number) {
    return this.complianceReportService.getRecentAlerts(days || 7);
  }

  /**
   * Get flagged transactions for review
   */
  @Query(() => [Object])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COMPLIANCE_OFFICER')
  async flaggedTransactions(
    @Args('startDate') startDate: Date,
    @Args('endDate') endDate: Date,
  ) {
    return this.amlMonitoring.getFlaggedTransactions(startDate, endDate);
  }

  /**
   * Get refund statistics
   */
  @Query(() => String)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'FINANCE', 'COMPLIANCE_OFFICER')
  async refundStatistics(
    @Args('startDate') startDate: Date,
    @Args('endDate') endDate: Date,
  ) {
    return this.refundRiskControl.getRefundStatistics(startDate, endDate);
  }
}