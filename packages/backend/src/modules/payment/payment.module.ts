import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaymentService } from './payment.service';
import { PaymentResolver } from './payment.resolver';
import { KYCService } from './kyc.service';
import { RiskControlService } from './risk-control.service';

@Module({
  imports: [HttpModule],
  providers: [
    PaymentService,
    PaymentResolver,
    KYCService,
    RiskControlService,
  ],
  exports: [PaymentService, KYCService, RiskControlService],
})
export class PaymentModule {}