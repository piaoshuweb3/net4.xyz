import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { KYCService } from './kyc.service';
import { RiskControlService } from './risk-control.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CreatePaymentInput, PaymentCallbackInput } from './dto/payment.input';
import { PaymentOrderResponse, PaymentStatusResponse, ExchangeRateResponse, ReconciliationResponse, KYCSubmissionResponse, KYCStatusResponse, RiskCheckResponse, TransactionLimitResponse } from './dto/payment.response';
import { PaymentMethod } from '@prisma/client';

@Resolver()
export class PaymentResolver {
  constructor(
    private paymentService: PaymentService,
    private kycService: KYCService,
    private riskControlService: RiskControlService,
  ) {}

  /**
   * 创建支付订单
   */
  @Mutation(() => PaymentOrderResponse)
  @UseGuards(AuthGuard)
  async createPaymentOrder(
    @Context() context: any,
    @Args('input') input: CreatePaymentInput,
  ) {
    const userId = context.req.user.id;
    const paymentMethod = input.paymentMethod as PaymentMethod;

    if (paymentMethod === PaymentMethod.CREDIT_CARD) {
      return this.paymentService.createTransakOrder({
        ...input,
        userId,
        orderId: `TRANSAK-${Date.now()}`,
      });
    } else if (paymentMethod === PaymentMethod.USDT) {
      return this.paymentService.createUsdtTransferOrder({
        ...input,
        userId,
      });
    }

    throw new Error('Unsupported payment method');
  }

  /**
   * 获取支付订单状态
   */
  @Query(() => PaymentStatusResponse)
  async getPaymentStatus(@Args('orderId') orderId: string) {
    return this.paymentService.getPaymentStatus(orderId);
  }

  /**
   * 验证 USDT 支付
   */
  @Mutation(() => PaymentOrderResponse)
  @UseGuards(AuthGuard)
  async verifyUsdtPayment(
    @Args('orderId') orderId: string,
    @Args('txHash') txHash: string,
  ) {
    return this.paymentService.verifyUsdtPayment(orderId, txHash);
  }

  /**
   * 获取汇率
   */
  @Query(() => ExchangeRateResponse)
  async getExchangeRate(
    @Args('fromCurrency') fromCurrency: string,
    @Args('toCurrency', { defaultValue: 'usdt' }) toCurrency: string,
  ) {
    return this.paymentService.getExchangeRate(fromCurrency, toCurrency);
  }

  /**
   * 财务对账（需要管理员权限）
   */
  @Query(() => ReconciliationResponse)
  @UseGuards(AuthGuard)
  async reconcile(
    @Context() context: any,
    @Args('startDate') startDate: Date,
    @Args('endDate') endDate: Date,
  ) {
    // 验证管理员权限
    if (!context.req.user.isAdmin) {
      throw new Error('Admin access required');
    }
    return this.paymentService.reconcile(startDate, endDate);
  }

  /**
   * 处理 Transak Webhook 回调
   */
  @Mutation(() => Boolean)
  async handleTransakWebhook(@Args('data') data: PaymentCallbackInput) {
    const result = await this.paymentService.handleTransakCallback(data);
    return result.success;
  }

  /**
   * 处理 Simplex Webhook 回调
   */
  @Mutation(() => Boolean)
  async handleSimplexWebhook(@Args('data', { type: () => String }) data: any) {
    const result = await this.paymentService.handleSimplexCallback(data);
    return result.success;
  }

  /**
   * 创建 KYC 验证申请
   */
  @Mutation(() => KYCSubmissionResponse)
  @UseGuards(AuthGuard)
  async createKYCApplication(
    @Context() context: any,
    @Args('level', { defaultValue: 'standard' }) level: string,
  ) {
    const userId = context.req.user.id;
    return this.kycService.createKYCApplication(userId, level);
  }

  /**
   * 获取 KYC 验证状态
   */
  @Query(() => KYCStatusResponse)
  @UseGuards(AuthGuard)
  async getKYCStatus(@Context() context: any) {
    const userId = context.req.user.id;
    return this.kycService.getKYCStatus(userId);
  }

  /**
   * 处理 KYC Webhook 回调
   */
  @Mutation(() => Boolean)
  async handleKYCWebhook(
    @Args('applicantId') applicantId: string,
    @Args('reviewStatus') reviewStatus: string,
    @Args('riskScore', { nullable: true }) riskScore?: number,
    @Args('documentType', { nullable: true }) documentType?: string,
  ) {
    const result = await this.kycService.handleKYCCallback({
      applicantId,
      reviewStatus,
      riskScore,
      documentType,
    });
    return result.success;
  }

  /**
   * 评估支付风险
   */
  @Query(() => RiskCheckResponse)
  @UseGuards(AuthGuard)
  async assessPaymentRisk(
    @Context() context: any,
    @Args('amount', { type: () => Number }) amount: number,
    @Args('paymentMethod', { type: () => String }) paymentMethod: PaymentMethod,
  ) {
    const userId = context.req.user.id;
    return this.riskControlService.assessPaymentRisk(userId, amount, paymentMethod);
  }

  /**
   * 获取用户交易限额
   */
  @Query(() => TransactionLimitResponse)
  @UseGuards(AuthGuard)
  async getTransactionLimits(@Context() context: any) {
    const userId = context.req.user.id;
    return this.riskControlService.getTransactionLimits(userId);
  }
}