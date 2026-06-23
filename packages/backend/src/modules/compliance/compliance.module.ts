import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ComplianceService } from './compliance.service';
import { ComplianceResolver } from './compliance.resolver';
import { SecuritiesAvoidanceService } from './securities-avoidance.service';
import { AmlMonitoringService } from './aml-monitoring.service';
import { RefundRiskControlService } from './refund-risk-control.service';
import { ComplianceReportService } from './compliance-report.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [ConfigModule, CommonModule],
  providers: [
    ComplianceService,
    ComplianceResolver,
    SecuritiesAvoidanceService,
    AmlMonitoringService,
    RefundRiskControlService,
    ComplianceReportService,
  ],
  exports: [
    ComplianceService,
    SecuritiesAvoidanceService,
    AmlMonitoringService,
    RefundRiskControlService,
    ComplianceReportService,
  ],
})
export class ComplianceModule {}