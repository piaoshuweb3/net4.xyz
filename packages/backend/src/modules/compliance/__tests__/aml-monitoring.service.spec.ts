import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AmlMonitoringService } from '../aml-monitoring.service';
import { PrismaService } from '../../common/services/prisma.service';

describe('AmlMonitoringService', () => {
  let service: AmlMonitoringService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ isVerified: true, createdAt: new Date() }),
    },
    memberTransaction: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AmlMonitoringService,
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

    service = module.get<AmlMonitoringService>(AmlMonitoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('performAmlCheck', () => {
    it('should return low risk for normal transaction', async () => {
      const result = await service.performAmlCheck('user-123', 100, 'US', '8.8.8.8');
      
      expect(result.allowed).toBe(true);
      expect(result.riskLevel).toBe('low');
      expect(result.watchlistMatch).toBe(false);
    });

    it('should flag high-risk country', async () => {
      const result = await service.performAmlCheck('user-123', 100, 'KP', '8.8.8.8');
      
      expect(result.allowed).toBe(false);
      expect(result.riskLevel).toBe('high');
      expect(result.flags.some(f => f.includes('High-risk'))).toBe(true);
    });

    it('should flag medium-risk country', async () => {
      const result = await service.performAmlCheck('user-123', 100, 'VN', '8.8.8.8');
      
      expect(result.riskLevel).toBe('medium');
      expect(result.flags.some(f => f.includes('Medium-risk'))).toBe(true);
    });

    it('should require manual review for large transaction', async () => {
      const result = await service.performAmlCheck('user-123', 50000, 'US', '8.8.8.8');
      
      expect(result.requiresManualReview).toBe(true);
      expect(result.flags.some(f => f.includes('Large transaction'))).toBe(true);
    });

    it('should flag potential structuring', async () => {
      const result = await service.performAmlCheck('user-123', 9500, 'US', '8.8.8.8');
      
      expect(result.flags.some(f => f.includes('structuring'))).toBe(true);
    });

    it('should detect private IP address', async () => {
      const result = await service.performAmlCheck('user-123', 100, 'US', '192.168.1.1');
      
      expect(result.flags.some(f => f.includes('Private IP'))).toBe(true);
    });
  });

  describe('getUserAmlStatus', () => {
    it('should return low risk for new user', async () => {
      mockPrismaService.memberTransaction.findMany.mockResolvedValueOnce([]);
      
      const result = await service.getUserAmlStatus('user-123');
      
      expect(result.riskLevel).toBe('low');
      expect(result.totalTransactions).toBe(0);
      expect(result.totalVolume).toBe(0);
      expect(result.watchlistStatus).toBe('clear');
    });

    it('should return medium risk for high volume user', async () => {
      mockPrismaService.memberTransaction.findMany.mockResolvedValueOnce(
        Array(25).fill({ amount: 1000, status: 'COMPLETED' })
      );
      
      const result = await service.getUserAmlStatus('user-123');
      
      expect(result.riskLevel).toBe('medium');
      expect(result.totalTransactions).toBe(25);
    });

    it('should return high risk for very high volume user', async () => {
      mockPrismaService.memberTransaction.findMany.mockResolvedValueOnce(
        Array(30).fill({ amount: 5000, status: 'COMPLETED' })
      );
      
      const result = await service.getUserAmlStatus('user-123');
      
      expect(result.riskLevel).toBe('high');
      expect(result.totalVolume).toBe(150000);
    });
  });

  describe('watchlist management', () => {
    it('should add user to watchlist', async () => {
      await service.addToWatchlist('user-123', 'Suspicious activity');
      
      // Check that audit log was created
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            action: 'WATCHLIST_ADD',
          }),
        })
      );
    });

    it('should remove user from watchlist', async () => {
      await service.addToWatchlist('user-123', 'Test');
      await service.removeFromWatchlist('user-123', 'Cleared');
      
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'WATCHLIST_REMOVE',
          }),
        })
      );
    });
  });

  describe('getFlaggedTransactions', () => {
    it('should return flagged transactions', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      mockPrismaService.auditLog.findMany.mockResolvedValueOnce([
        {
          userId: 'user-1',
          createdAt: new Date(),
          details: { riskLevel: 'high', requiresManualReview: true },
        },
        {
          userId: 'user-2',
          createdAt: new Date(),
          details: { riskLevel: 'low', requiresManualReview: false },
        },
      ]);
      
      const result = await service.getFlaggedTransactions(startDate, endDate);
      
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
    });
  });
});