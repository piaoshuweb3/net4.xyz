import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../common/services/prisma.service';
import { PaymentStatus, PaymentMethod } from '@prisma/client';
import { CreatePaymentInput, PaymentCallbackInput } from './dto/payment.input';
import { KYCService } from './kyc.service';
import { RiskControlService } from './risk-control.service';

@Injectable()
export class PaymentService {
  private transakApiKey: string;
  private transakApiUrl: string;
  private simplexApiKey: string;
  private simplexApiUrl: string;
  private usdtContractAddress: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private prisma: PrismaService,
  ) {
    this.transakApiKey = this.configService.get('TRANSAK_API_KEY', '');
    this.transakApiUrl = this.configService.get('TRANSAK_API_URL', 'https://api.transak.com');
    this.simplexApiKey = this.configService.get('SIMPLEX_API_KEY', '');
    this.simplexApiUrl = this.configService.get('SIMPLEX_API_URL', 'https://api.simplex.com');
    this.usdtContractAddress = this.configService.get('USDT_CONTRACT_ADDRESS', '');
  }

  /**
   * 创建 Transak 支付订单
   */
  async createTransakOrder(input: CreatePaymentInput) {
    try {
      const response = await this.httpService.axiosRef.post(
        `${this.transakApiUrl}/api/v1/orders`,
        {
          apiKey: this.transakApiKey,
          referenceId: input.orderId,
          fiatCurrency: input.fiatCurrency || 'USD',
          cryptoCurrency: 'USDT',
          amount: input.amount,
          walletAddress: input.walletAddress,
          redirectURL: `${this.configService.get('FRONTEND_URL')}/payment/complete?orderId=${input.orderId}`,
          webhookURL: `${this.configService.get('BACKEND_URL')}/payment/webhook/transak`,
        },
      );

      return {
        orderId: input.orderId,
        paymentUrl: response.data.response?.paymentUrl,
        status: 'PENDING',
      };
    } catch (error) {
      console.error('Transak order creation failed:', error.message);
      throw new BadRequestException('Failed to create payment order');
    }
  }

  /**
   * 创建 Simplex 支付订单
   */
  async createSimplexOrder(input: CreatePaymentInput) {
    try {
      const response = await this.httpService.axiosRef.post(
        `${this.simplexApiUrl}/v1/quote`,
        {
          api_key: this.simplexApiKey,
          reference: input.orderId,
          currency_in: input.fiatCurrency || 'USD',
          currency_out: 'USDT',
          amount_in: input.amount,
          wallet_address: input.walletAddress,
        },
      );

      return {
        orderId: input.orderId,
        paymentUrl: response.data?.payment_url,
        status: 'PENDING',
      };
    } catch (error) {
      console.error('Simplex order creation failed:', error.message);
      throw new BadRequestException('Failed to create payment order');
    }
  }

  /**
   * 处理 Transak 支付回调
   */
  async handleTransakCallback(data: PaymentCallbackInput) {
    const { referenceId, status, cryptoTxHash } = data;

    // 查找订单
    const order = await this.prisma.memberTransaction.findUnique({
      where: { id: referenceId },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // 映射 Transak 状态到我们的状态
    const statusMap: Record<string, PaymentStatus> = {
      COMPLETED: PaymentStatus.COMPLETED,
      FAILED: PaymentStatus.FAILED,
      CANCELLED: PaymentStatus.REFUNDED,
      PENDING: PaymentStatus.PROCESSING,
    };

    const paymentStatus = statusMap[status] || PaymentStatus.PENDING;

    // 更新订单
    await this.prisma.memberTransaction.update({
      where: { id: referenceId },
      data: {
        status: paymentStatus,
        txHash: cryptoTxHash,
      },
    });

    // 如果支付成功，升级会员
    if (paymentStatus === PaymentStatus.COMPLETED) {
      await this.prisma.user.update({
        where: { id: order.userId },
        data: {
          memberLevel: order.level,
          memberExpiry: order.expiresAt,
        },
      });
    }

    return { success: true, status: paymentStatus };
  }

  /**
   * 处理 Simplex 支付回调
   */
  async handleSimplexCallback(data: any) {
    const { reference, status, txHash } = data;

    const order = await this.prisma.memberTransaction.findUnique({
      where: { id: reference },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const simplexStatusMap: Record<string, PaymentStatus> = {
      success: PaymentStatus.COMPLETED,
      failed: PaymentStatus.FAILED,
      pending: PaymentStatus.PROCESSING,
    };

    const paymentStatus = simplexStatusMap[status] || PaymentStatus.PENDING;

    await this.prisma.memberTransaction.update({
      where: { id: reference },
      data: {
        status: paymentStatus,
        txHash,
      },
    });

    if (paymentStatus === PaymentStatus.COMPLETED) {
      await this.prisma.user.update({
        where: { id: order.userId },
        data: {
          memberLevel: order.level,
          memberExpiry: order.expiresAt,
        },
      });
    }

    return { success: true, status: paymentStatus };
  }

  /**
   * 创建 USDT 转账订单（链上）
   */
  async createUsdtTransferOrder(input: CreatePaymentInput) {
    // 生成一个唯一的订单ID
    const orderId = `USDT-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // 创建链上转账订单
    const order = await this.prisma.memberTransaction.create({
      data: {
        userId: input.userId!,
        amount: input.amount,
        currency: 'USDT',
        level: input.level,
        paymentMethod: PaymentMethod.USDT,
        status: PaymentStatus.PENDING,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时过期
      },
    });

    // 返回收款地址和金额
    return {
      orderId: order.id,
      receiveAddress: this.configService.get('USDT_RECEIVE_ADDRESS', ''),
      amount: input.amount,
      network: 'Base',
      status: 'PENDING',
    };
  }

  /**
   * 验证 USDT 支付
   */
  async verifyUsdtPayment(orderId: string, txHash: string) {
    const order = await this.prisma.memberTransaction.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // 更新订单状态
    await this.prisma.memberTransaction.update({
      where: { id: orderId },
      data: {
        status: PaymentStatus.COMPLETED,
        txHash,
      },
    });

    // 升级会员
    await this.prisma.user.update({
      where: { id: order.userId },
      data: {
        memberLevel: order.level,
        memberExpiry: order.expiresAt,
      },
    });

    return { success: true };
  }

  /**
   * 获取支付订单状态
   */
  async getPaymentStatus(orderId: string) {
    const order = await this.prisma.memberTransaction.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    return {
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      level: order.level,
      txHash: order.txHash,
    };
  }

  /**
   * 获取支付汇率
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string = 'USDT') {
    try {
      // 使用 CoinGecko API 获取汇率
      const response = await this.httpService.axiosRef.get(
        `https://api.coingecko.com/api/v3/simple/price`,
        {
          params: {
            ids: fromCurrency.toLowerCase(),
            vs_currencies: toCurrency.toLowerCase(),
          },
        },
      );

      return {
        from: fromCurrency,
        to: toCurrency,
        rate: response.data[fromCurrency.toLowerCase()]?.[toCurrency.toLowerCase()],
      };
    } catch (error) {
      console.error('Failed to get exchange rate:', error.message);
      return {
        from: fromCurrency,
        to: toCurrency,
        rate: null,
      };
    }
  }

  /**
   * 财务对账
   */
  async reconcile(startDate: Date, endDate: Date) {
    const transactions = await this.prisma.memberTransaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: PaymentStatus.COMPLETED,
      },
      include: {
        user: {
          select: {
            email: true,
            address: true,
          },
        },
      },
    });

    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const byLevel = {
      BASIC: 0,
      MEDIUM: 0,
      ADVANCED: 0,
    };

    transactions.forEach((tx) => {
      byLevel[tx.level] += tx.amount;
    });

    return {
      period: { startDate, endDate },
      totalTransactions: transactions.length,
      totalAmount,
      byLevel,
      transactions: transactions.map((tx) => ({
        id: tx.id,
        userEmail: tx.user?.email ?? '',
        userAddress: tx.user?.address ?? '',
        amount: tx.amount,
        level: tx.level,
        txHash: tx.txHash,
        completedAt: tx.updatedAt,
      })),
    };
  }
}