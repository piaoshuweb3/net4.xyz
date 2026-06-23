import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RefundRiskControlService } from '../refund-risk-control.service';
import { PrismaService } from '../../common/services/prisma.service';

describe('RefundRiskControlService', () => {
  let service: RefundRiskControlService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ isVerified: true }),
    },
    memberTransaction: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    },
    systemConfig: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundRiskControlService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-value'),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RefundRiskControlService>(RefundRiskControlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assessRefundRisk', () => {
    it('should return non-refundable for NFT purchases', async () => {
      const result = await service.assessRefundRisk('user-123', 'nft', 9999);
      
      expect(result.allowed).toBe(true);
      expect(result.refundEligibility).toBe(false);
      expect(result.refundWindowDays).toBe(90);
      expect(result.nonRefundableReasons.some(r => r.includes('90 days'))).toBe(true);
    });

    it('should return refundable for service purchases', async () => {
      const result = await service.assessRefundRisk('user-123', 'service', 99);
      
      expect(result.allowed).toBe(true);
      expect(result.refundEligibility).toBe(true);
      expect(result.refundWindowDays).toBe(7);
    });

    it('should return non-refundable for token purchases', async () => {
      const result = await service.assessRefundRisk('user-123', 'token', 1000);
      
      expect(result.allowed).toBe(true);
      expect(result.refundEligibility).toBe(false);
      expect(result.refundWindowDays).toBe(0);
    });

    it('should block user with high refund rate', async () => {
      // Mock user with high refund rate
      mockPrismaService.systemConfig.findUnique.mockResolvedValueOnce({
        value: { blocked: true, reason: 'Excessive refunds' },
      });
      
      const result = await service.assessRefundRisk('user-123', 'service', 99);
      
      expect(result.allowed).toBe(false);
      expect(result.riskScore).toBe(100);
    });
  });

  describe('processRefund', () => {
    it('should fail for non-existent transaction', async () => {
      mockPrismaService.memberTransaction.findUnique.mockResolvedValueOnce(null);
      
      const result = await service.processRefund('user-123', 'tx-123');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should fail for NFT transaction (non-refundable)', async () => {
      mockPrismaService.memberTransaction.findUnique.mockResolvedValueOnce({
        id: 'tx-123',
        userId: 'user-123',
        amount: 9999,
        level: 'SUB',
        status: 'COMPLETED',
        createdAt: new Date(),
      });
      
      const result = await service.processRefund('user-123', 'tx-123');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('not available');
    });

    it('should fail for token transaction (non-refundable)', async () => {
      const recentDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      
      mockPrismaService.memberTransaction.findUnique.mockResolvedValueOnce({
        id: 'tx-123',
        userId: 'user-123',
        amount: 1000,
        level: 'TOKEN',
        status: 'COMPLETED',
        createdAt: recentDate,
      });
      
      const result = await service.processRefund('user-123', 'tx-123');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('not available');
    });
  });

  describe('getUserRefundStatus', () => {
    it('should return low risk for new user', async () => {
      mockPrismaService.memberTransaction.findMany.mockResolvedValueOnce([]);
      
      const result = await service.getUserRefundStatus('user-123');
      
      expect(result.refundRiskLevel).toBe('low');
      expect(result.totalRefunds).toBe(0);
      expect(result.isBlocked).toBe(false);
    });

    it('should detect high refund rate', async () => {
      const transactions = [
        ...Array(5).fill({ status: 'COMPLETED' }),
        ...Array(3).fill({ status: 'REFUNDED' }),
      ];
      mockPrismaService.memberTransaction.findMany.mockResolvedValueOnce(transactions);
      
      const result = await service.getUserRefundStatus('user-123');
      
      expect(result.refundRiskLevel).toBe('high');
      expect(result.refundRate).toBeGreaterThan(0.3);
    });

    it('should detect blocked user', async () => {
      mockPrismaService.systemConfig.findUnique.mockResolvedValueOnce({
        value: { blocked: true, reason: 'Fraudulent activity' },
      });
      
      const result = await service.getUserRefundStatus('user-123');
      
      expect(result.isBlocked).toBe(true);
      expect(result.blockReason).toBe('Fraudulent activity');
    });
  });

  describe('blockUserRefunds', () => {
    it('should block user from refunds', async () => {
      await service.blockUserRefunds('user-123', 'Excessive chargebacks');
      
      expect(mockPrismaService.systemConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'refund_block_user-123' },
        })
      );
    });
  });

  describe('unblockUserRefunds', () => {
    it('should unblock user from refunds', async () => {
      await service.unblockUserRefunds('user-123');
      
      expect(mockPrismaService.systemConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'refund_block_user-123' },
        })
      );
    });
  });

  describe('getRefundStatistics', () => {
    it('should calculate correct statistics', async () => {
      const transactions = [
        { status: 'COMPLETED', amount: 100 },
        { status: 'COMPLETED', amount: 200 },
        { status: 'REFUNDED', amount: 50 },
      ];
      mockPrismaService.memberTransaction.findMany.mockResolvedValueOnce(transactions);
      
      const result = await service.getRefundStatistics(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
      
      expect(result.totalTransactions).toBe(3);
      expect(result.completedTransactions).toBe(2);
      expect(result.refundedTransactions).toBe(1);
      expect(result.refundRate).toBe(0.5);
      expect(result.totalVolume).toBe(300);
      expect(result.refundedVolume).toBe(50);
    });
  });
});