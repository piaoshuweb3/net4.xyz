import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { BadRequestException } from '@nestjs/common';
import { PaymentService } from '../payment.service';
import { KYCService } from '../kyc.service';
import { RiskControlService } from '../risk-control.service';
import { PrismaService } from '../../common/services/prisma.service';
import { PaymentStatus, PaymentMethod, MemberLevel } from '@prisma/client';
import { of, throwError } from 'rxjs';

// Mock data
const mockPrisma = {
  memberTransaction: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  user: {
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  systemConfig: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    create: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

const mockHttpService = {
  axiosRef: {
    post: jest.fn(),
    get: jest.fn(),
  },
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => {
    const config: Record<string, string> = {
      TRANSAK_API_KEY: 'test-transak-key',
      TRANSAK_API_URL: 'https://api.transak.com',
      SIMPLEX_API_KEY: 'test-simplex-key',
      SIMPLEX_API_URL: 'https://api.simplex.com',
      USDT_CONTRACT_ADDRESS: '0x1234567890123456789012345678901234567890',
      USDT_RECEIVE_ADDRESS: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      FRONTEND_URL: 'http://localhost:3001',
      BACKEND_URL: 'http://localhost:3000',
      SUMSUB_API_KEY: 'test-sumsub-key',
      SUMSUB_API_URL: 'https://api.sumsub.com',
      SUMSUB_APP_ID: 'test-app-id',
    };
    return config[key] || defaultValue || '';
  }),
};

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: any;
  let httpService: any;
  let kycService: KYCService;
  let riskControlService: RiskControlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        KYCService,
        RiskControlService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    kycService = module.get<KYCService>(KYCService);
    riskControlService = module.get<RiskControlService>(RiskControlService);
    prisma = module.get(PrismaService);
    httpService = module.get(HttpService);

    jest.clearAllMocks();
  });

  describe('createTransakOrder', () => {
    it('should create a Transak order successfully', async () => {
      const input = {
        orderId: 'TEST-ORDER-001',
        amount: 99,
        walletAddress: '0xwallet123',
        userId: 'user-123',
        fiatCurrency: 'USD',
      };

      mockHttpService.axiosRef.post.mockResolvedValueOnce({
        data: {
          response: {
            paymentUrl: 'https://transak.com/pay/123',
          },
        },
      });

      const result = await service.createTransakOrder(input);

      expect(result.orderId).toBe(input.orderId);
      expect(result.paymentUrl).toBe('https://transak.com/pay/123');
      expect(result.status).toBe('PENDING');
    });

    it('should throw BadRequestException when Transak API fails', async () => {
      const input = {
        orderId: 'TEST-ORDER-002',
        amount: 99,
        walletAddress: '0xwallet123',
        userId: 'user-123',
      };

      mockHttpService.axiosRef.post.mockRejectedValueOnce(
        new Error('API Error'),
      );

      await expect(service.createTransakOrder(input)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createSimplexOrder', () => {
    it('should create a Simplex order successfully', async () => {
      const input = {
        orderId: 'TEST-ORDER-003',
        amount: 99,
        walletAddress: '0xwallet123',
        userId: 'user-123',
        fiatCurrency: 'USD',
      };

      mockHttpService.axiosRef.post.mockResolvedValueOnce({
        data: {
          payment_url: 'https://simplex.com/pay/456',
        },
      });

      const result = await service.createSimplexOrder(input);

      expect(result.orderId).toBe(input.orderId);
      expect(result.paymentUrl).toBe('https://simplex.com/pay/456');
      expect(result.status).toBe('PENDING');
    });
  });

  describe('handleTransakCallback', () => {
    it('should handle successful payment callback', async () => {
      const callbackData = {
        referenceId: 'order-123',
        status: 'COMPLETED',
        cryptoTxHash: '0xhash123',
      };

      const mockOrder = {
        id: 'order-123',
        userId: 'user-123',
        level: MemberLevel.BASIC,
        expiresAt: new Date('2025-12-31'),
      };

      mockPrisma.memberTransaction.findUnique.mockResolvedValueOnce(mockOrder);
      mockPrisma.memberTransaction.update.mockResolvedValueOnce({});
      mockPrisma.user.update.mockResolvedValueOnce({});

      const result = await service.handleTransakCallback(callbackData);

      expect(result.success).toBe(true);
      expect(result.status).toBe(PaymentStatus.COMPLETED);
    });

    it('should throw error when order not found', async () => {
      const callbackData = {
        referenceId: 'nonexistent-order',
        status: 'COMPLETED',
        cryptoTxHash: '0xhash123',
      };

      mockPrisma.memberTransaction.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.handleTransakCallback(callbackData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle failed payment status', async () => {
      const callbackData = {
        referenceId: 'order-123',
        status: 'FAILED',
        cryptoTxHash: '0xhash123',
      };

      const mockOrder = {
        id: 'order-123',
        userId: 'user-123',
        level: MemberLevel.BASIC,
        expiresAt: new Date('2025-12-31'),
      };

      mockPrisma.memberTransaction.findUnique.mockResolvedValueOnce(mockOrder);
      mockPrisma.memberTransaction.update.mockResolvedValueOnce({});

      const result = await service.handleTransakCallback(callbackData);

      expect(result.status).toBe(PaymentStatus.FAILED);
    });
  });

  describe('createUsdtTransferOrder', () => {
    it('should create a USDT transfer order', async () => {
      const input = {
        userId: 'user-123',
        amount: 99,
        level: MemberLevel.BASIC,
        walletAddress: '0xwallet123',
      };

      const mockCreatedOrder = {
        id: 'USDT-123',
        userId: input.userId,
        amount: input.amount,
        currency: 'USDT',
        level: input.level,
        paymentMethod: PaymentMethod.USDT,
        status: PaymentStatus.PENDING,
        expiresAt: new Date(),
      };

      mockPrisma.memberTransaction.create.mockResolvedValueOnce(
        mockCreatedOrder,
      );

      const result = await service.createUsdtTransferOrder(input);

      expect(result.orderId).toBeDefined();
      expect(result.receiveAddress).toBeDefined();
      expect(result.amount).toBe(input.amount);
      expect(result.network).toBe('Base');
      expect(result.status).toBe('PENDING');
    });
  });

  describe('verifyUsdtPayment', () => {
    it('should verify USDT payment and upgrade membership', async () => {
      const orderId = 'order-123';
      const txHash = '0xhash456';

      const mockOrder = {
        id: orderId,
        userId: 'user-123',
        level: MemberLevel.MEDIUM,
        expiresAt: new Date('2025-12-31'),
      };

      mockPrisma.memberTransaction.findUnique.mockResolvedValueOnce(mockOrder);
      mockPrisma.memberTransaction.update.mockResolvedValueOnce({});
      mockPrisma.user.update.mockResolvedValueOnce({});

      const result = await service.verifyUsdtPayment(orderId, txHash);

      expect(result.success).toBe(true);
      expect(mockPrisma.memberTransaction.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: {
          status: PaymentStatus.COMPLETED,
          txHash,
        },
      });
    });

    it('should throw error when order not found', async () => {
      mockPrisma.memberTransaction.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.verifyUsdtPayment('nonexistent', '0xhash'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status', async () => {
      const mockOrder = {
        id: 'order-123',
        status: PaymentStatus.COMPLETED,
        amount: 99,
        currency: 'USDT',
        level: MemberLevel.BASIC,
        txHash: '0xhash123',
      };

      mockPrisma.memberTransaction.findUnique.mockResolvedValueOnce(mockOrder);

      const result = await service.getPaymentStatus('order-123');

      expect(result.orderId).toBe('order-123');
      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(result.amount).toBe(99);
    });

    it('should throw error when order not found', async () => {
      mockPrisma.memberTransaction.findUnique.mockResolvedValueOnce(null);

      await expect(service.getPaymentStatus('nonexistent')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getExchangeRate', () => {
    it('should return exchange rate from CoinGecko', async () => {
      mockHttpService.axiosRef.get.mockResolvedValueOnce({
        data: {
          ethereum: { usdt: 0.00035 },
        },
      });

      const result = await service.getExchangeRate('ethereum', 'usdt');

      expect(result.from).toBe('ethereum');
      expect(result.to).toBe('usdt');
      expect(result.rate).toBe(0.00035);
    });

    it('should return null rate when API fails', async () => {
      mockHttpService.axiosRef.get.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.getExchangeRate('bitcoin', 'usdt');

      expect(result.rate).toBeNull();
    });
  });

  describe('reconcile', () => {
    it('should return reconciliation data', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockTransactions = [
        {
          id: 'tx-1',
          user: { email: 'user1@test.com', address: '0xaddr1' },
          amount: 99,
          level: MemberLevel.BASIC,
          txHash: '0xhash1',
          updatedAt: new Date(),
        },
        {
          id: 'tx-2',
          user: { email: 'user2@test.com', address: '0xaddr2' },
          amount: 999,
          level: MemberLevel.MEDIUM,
          txHash: '0xhash2',
          updatedAt: new Date(),
        },
      ];

      mockPrisma.memberTransaction.findMany.mockResolvedValueOnce(
        mockTransactions,
      );

      const result = await service.reconcile(startDate, endDate);

      expect(result.totalTransactions).toBe(2);
      expect(result.totalAmount).toBe(1098);
      expect(result.byLevel.BASIC).toBe(99);
      expect(result.byLevel.MEDIUM).toBe(999);
      expect(result.transactions).toHaveLength(2);
    });

    it('should handle empty reconciliation period', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrisma.memberTransaction.findMany.mockResolvedValueOnce([]);

      const result = await service.reconcile(startDate, endDate);

      expect(result.totalTransactions).toBe(0);
      expect(result.totalAmount).toBe(0);
    });
  });
});

describe('KYCService', () => {
  let kycService: KYCService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KYCService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    kycService = module.get<KYCService>(KYCService);
  });

  describe('requiresKYC', () => {
    it('should return true for large transactions (>= $100,000)', () => {
      expect(kycService.requiresKYC(100000)).toBe(true);
      expect(kycService.requiresKYC(150000)).toBe(true);
    });

    it('should return false for smaller transactions', () => {
      expect(kycService.requiresKYC(99999)).toBe(false);
      expect(kycService.requiresKYC(5000)).toBe(false);
    });
  });

  describe('requiresCryptoPayment', () => {
    it('should return true for amounts > $5,000', () => {
      expect(kycService.requiresCryptoPayment(5001)).toBe(true);
      expect(kycService.requiresCryptoPayment(10000)).toBe(true);
    });

    it('should return false for amounts <= $5,000', () => {
      expect(kycService.requiresCryptoPayment(5000)).toBe(false);
      expect(kycService.requiresCryptoPayment(100)).toBe(false);
    });
  });

  describe('getKYCLevel', () => {
    it('should return enhanced for amounts >= $100,000', () => {
      expect(kycService.getKYCLevel(100000)).toBe('enhanced');
    });

    it('should return standard for amounts >= $50,000', () => {
      expect(kycService.getKYCLevel(50000)).toBe('standard');
      expect(kycService.getKYCLevel(99999)).toBe('standard');
    });

    it('should return basic for amounts >= $10,000', () => {
      expect(kycService.getKYCLevel(10000)).toBe('basic');
      expect(kycService.getKYCLevel(49999)).toBe('basic');
    });

    it('should return none for smaller amounts', () => {
      expect(kycService.getKYCLevel(9999)).toBe('none');
      expect(kycService.getKYCLevel(100)).toBe('none');
    });
  });

  describe('createKYCApplication', () => {
    it('should create a KYC application for valid user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        address: '0x1234567890abcdef',
      };

      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.systemConfig.upsert.mockResolvedValueOnce({});

      const result = await kycService.createKYCApplication('user-123', 'standard');

      expect(result.submissionId).toBeDefined();
      expect(result.verificationUrl).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        kycService.createKYCApplication('nonexistent', 'standard'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getKYCStatus', () => {
    it('should return unverified for user without KYC', async () => {
      mockPrisma.systemConfig.findMany.mockResolvedValueOnce([]);

      const result = await kycService.getKYCStatus('user-123');

      expect(result.verified).toBe(false);
      expect(result.level).toBe('none');
    });

    it('should return verified status for approved KYC', async () => {
      mockPrisma.systemConfig.findMany.mockResolvedValueOnce([
        {
          key: 'kyc_test',
          value: {
            userId: 'user-123',
            status: 'approved',
            level: 'standard',
            riskScore: 20,
          },
        },
      ]);

      const result = await kycService.getKYCStatus('user-123');

      expect(result.verified).toBe(true);
      expect(result.level).toBe('standard');
    });
  });

  describe('validatePaymentForUser', () => {
    it('should allow payment for small amounts', async () => {
      const result = await kycService.validatePaymentForUser('user-123', 1000);

      expect(result.allowed).toBe(true);
    });

    it('should require KYC for large transactions if not verified', async () => {
      mockPrisma.systemConfig.findMany.mockResolvedValueOnce([]);

      const result = await kycService.validatePaymentForUser('user-123', 150000);

      expect(result.allowed).toBe(false);
      expect(result.requiresKYC).toBe(true);
    });

    it('should allow large transactions for verified users', async () => {
      mockPrisma.systemConfig.findMany.mockResolvedValueOnce([
        {
          key: 'kyc_test',
          value: {
            userId: 'user-123',
            status: 'approved',
            level: 'enhanced',
          },
        },
      ]);

      const result = await kycService.validatePaymentForUser('user-123', 150000);

      expect(result.allowed).toBe(true);
    });
  });
});

describe('RiskControlService', () => {
  let riskControlService: RiskControlService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskControlService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    riskControlService = module.get<RiskControlService>(RiskControlService);
  });

  describe('assessPaymentRisk', () => {
    it('should allow low-risk transactions', async () => {
      mockPrisma.memberTransaction.findMany.mockResolvedValueOnce([]);
      mockPrisma.memberTransaction.count.mockResolvedValueOnce(0);
      mockPrisma.memberTransaction.aggregate.mockResolvedValueOnce({ _sum: { amount: 0 } });

      const result = await riskControlService.assessPaymentRisk(
        'user-123',
        100,
        PaymentMethod.USDT,
      );

      expect(result.allowed).toBe(true);
      expect(result.riskLevel).toBe('low');
    });

    it('should block transactions from high-risk countries', async () => {
      mockPrisma.memberTransaction.findMany.mockResolvedValueOnce([]);
      mockPrisma.memberTransaction.count.mockResolvedValueOnce(0);
      mockPrisma.memberTransaction.aggregate.mockResolvedValueOnce({ _sum: { amount: 0 } });

      const result = await riskControlService.assessPaymentRisk(
        'user-123',
        100,
        PaymentMethod.USDT,
        { country: 'KP' }, // North Korea
      );

      // High-risk country adds 50 risk score, which should trigger high or critical
      expect(['high', 'critical']).toContain(result.riskLevel);
      expect(result.riskScore).toBeGreaterThanOrEqual(40);
    });

    it('should block credit card payments over limit', async () => {
      mockPrisma.memberTransaction.findMany.mockResolvedValueOnce([]);
      mockPrisma.memberTransaction.count.mockResolvedValueOnce(0);
      mockPrisma.memberTransaction.aggregate.mockResolvedValueOnce({ _sum: { amount: 0 } });

      const result = await riskControlService.assessPaymentRisk(
        'user-123',
        10000,
        PaymentMethod.CREDIT_CARD,
      );

      expect(result.allowed).toBe(false);
      // Check that at least one reason contains the expected text
      const hasExpectedReason = result.reasons.some(r => 
        r.includes('Credit card single transaction limit exceeded') || 
        r.includes('Credit card payments limited')
      );
      expect(hasExpectedReason).toBe(true);
    });
  });

  describe('checkTransactionLimits', () => {
    it('should allow USDT transactions within limits', () => {
      const result = riskControlService.checkTransactionLimits(
        10000,
        PaymentMethod.USDT,
      );

      expect(result.allowed).toBe(true);
    });

    it('should block credit card transactions over limit', () => {
      const result = riskControlService.checkTransactionLimits(
        10000,
        PaymentMethod.CREDIT_CARD,
      );

      expect(result.allowed).toBe(false);
      // Check that at least one reason contains the expected text
      const hasExpectedReason = result.reasons.some(r => 
        r.includes('Credit card single transaction limit exceeded')
      );
      expect(hasExpectedReason).toBe(true);
    });
  });

  describe('checkGeographicRisk', () => {
    it('should flag high-risk countries', () => {
      const result = riskControlService.checkGeographicRisk('KP');

      expect(result.allowed).toBe(false);
      expect(result.riskScore).toBe(50);
    });

    it('should flag medium-risk countries', () => {
      const result = riskControlService.checkGeographicRisk('VN');

      expect(result.riskScore).toBe(20);
    });

    it('should allow low-risk countries', () => {
      const result = riskControlService.checkGeographicRisk('US');

      expect(result.allowed).toBe(true);
      expect(result.riskScore).toBe(0);
    });
  });

  describe('getTransactionLimits', () => {
    it('should return lower limits for unverified users', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-123',
        isVerified: false,
      });

      const result = await riskControlService.getTransactionLimits('user-123');

      expect(result.dailyLimit).toBe(5000);
      expect(result.requiresKYC).toBe(true);
    });

    it('should return higher limits for verified users', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-123',
        isVerified: true,
      });

      const result = await riskControlService.getTransactionLimits('user-123');

      expect(result.dailyLimit).toBe(100000);
      expect(result.requiresKYC).toBe(false);
    });
  });

  describe('isUserBlocked', () => {
    it('should return not blocked for normal users', async () => {
      mockPrisma.systemConfig.findUnique.mockResolvedValueOnce(null);

      const result = await riskControlService.isUserBlocked('user-123');

      expect(result.blocked).toBe(false);
    });

    it('should return blocked status for blocked users', async () => {
      mockPrisma.systemConfig.findUnique.mockResolvedValueOnce({
        key: 'payment_block_user-123',
        value: {
          blocked: true,
          reason: 'Suspicious activity detected',
        },
      });

      const result = await riskControlService.isUserBlocked('user-123');

      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('Suspicious activity detected');
    });
  });
});