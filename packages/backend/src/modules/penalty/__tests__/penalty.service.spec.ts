import { Test, TestingModule } from '@nestjs/testing';
import { PenaltyService } from '../penalty.service';
import { PrismaService } from '../../common/services/prisma.service';
import { NodeStatus, PunishmentType } from '@prisma/client';

describe('PenaltyService', () => {
  let service: PenaltyService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    node: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    punishment: {
      create: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PenaltyService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<PenaltyService>(PenaltyService);
    prisma = module.get(PrismaService);
    
    jest.clearAllMocks();
  });

  describe('detectOfflineNodes', () => {
    it('should detect offline nodes and penalize them', async () => {
      const threshold = new Date(Date.now() - 5 * 60 * 1000);
      
      // Mock offline nodes
      mockPrisma.node.findMany.mockResolvedValue([
        { id: 'node-1', status: NodeStatus.ACTIVE, lastActiveAt: threshold, stakedAmount: 1000 },
        { id: 'node-2', status: NodeStatus.ACTIVE, lastActiveAt: threshold, stakedAmount: 500 },
      ]);

      // Mock today's penalty count (0 for both nodes)
      mockPrisma.punishment.count.mockResolvedValue(0);
      
      // Mock punishment creation
      mockPrisma.punishment.create.mockResolvedValue({
        id: 'punishment-1',
        nodeId: 'node-1',
        type: PunishmentType.OFFLINE,
        amount: 100,
        reason: 'Node offline for more than 5 minutes',
      });

      // Mock node update
      mockPrisma.node.update.mockResolvedValue({});

      const result = await service.detectOfflineNodes();

      expect(result.detected).toBe(2);
      expect(result.penalized).toBe(2);
      expect(mockPrisma.punishment.create).toHaveBeenCalledTimes(2);
    });

    it('should not penalize nodes that reached max daily penalties', async () => {
      const threshold = new Date(Date.now() - 5 * 60 * 1000);
      
      mockPrisma.node.findMany.mockResolvedValue([
        { id: 'node-1', status: NodeStatus.ACTIVE, lastActiveAt: threshold, stakedAmount: 1000 },
      ]);

      // Mock max penalties reached
      mockPrisma.punishment.count.mockResolvedValue(10);

      const result = await service.detectOfflineNodes();

      expect(result.detected).toBe(1);
      expect(result.penalized).toBe(0);
      expect(mockPrisma.punishment.create).not.toHaveBeenCalled();
    });
  });

  describe('punishNode', () => {
    it('should create punishment and update node stake', async () => {
      const node = {
        id: 'node-1',
        status: NodeStatus.ACTIVE,
        stakedAmount: 1000,
      };

      mockPrisma.node.findUnique.mockResolvedValue(node);
      mockPrisma.punishment.create.mockResolvedValue({
        id: 'punishment-1',
        nodeId: 'node-1',
        type: PunishmentType.CHEATING,
        amount: 1000,
        reason: 'Cheating detected',
      });
      mockPrisma.node.update.mockResolvedValue({});

      await service.punishNode('node-1', PunishmentType.CHEATING, 1000, 'Cheating detected');

      expect(mockPrisma.punishment.create).toHaveBeenCalledWith({
        data: {
          nodeId: 'node-1',
          type: PunishmentType.CHEATING,
          amount: 1000,
          reason: 'Cheating detected',
        },
      });

      expect(mockPrisma.node.update).toHaveBeenCalledWith({
        where: { id: 'node-1' },
        data: {
          status: NodeStatus.PUNISHING,
          stakedAmount: { decrement: 1000 },
        },
      });
    });

    it('should handle insufficient stake', async () => {
      const node = {
        id: 'node-1',
        status: NodeStatus.ACTIVE,
        stakedAmount: 50,
      };

      mockPrisma.node.findUnique.mockResolvedValue(node);
      mockPrisma.punishment.create.mockResolvedValue({
        id: 'punishment-1',
        nodeId: 'node-1',
        type: PunishmentType.OFFLINE,
        amount: 50,
        reason: 'Node offline',
      });
      mockPrisma.node.update.mockResolvedValue({});

      await service.punishNode('node-1', PunishmentType.OFFLINE, 100, 'Node offline');

      // Should use remaining stake amount
      expect(mockPrisma.punishment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 50,
          }),
        }),
      );
    });
  });

  describe('getPenaltyStats', () => {
    it('should return penalty statistics', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      mockPrisma.punishment.count
        .mockResolvedValueOnce(100)  // total
        .mockResolvedValueOnce(10)   // today
        .mockResolvedValueOnce(50)   // offline
        .mockResolvedValueOnce(30)   // cheating
        .mockResolvedValueOnce(20);  // content violation

      mockPrisma.punishment.aggregate.mockResolvedValue({
        _sum: { amount: 50000 },
      });

      const stats = await service.getPenaltyStats();

      expect(stats.totalPenalties).toBe(100);
      expect(stats.todayPenalties).toBe(10);
      expect(stats.offlinePenalties).toBe(50);
      expect(stats.cheatingPenalties).toBe(30);
      expect(stats.totalPenaltyAmount).toBe(50000);
    });
  });

  describe('resolvePunishment', () => {
    it('should resolve punishment and restore node status', async () => {
      const punishment = {
        id: 'punishment-1',
        nodeId: 'node-1',
        isResolved: false,
      };

      mockPrisma.punishment.findUnique.mockResolvedValue(punishment);
      mockPrisma.punishment.update.mockResolvedValue({});
      mockPrisma.node.update.mockResolvedValue({});

      const result = await service.resolvePunishment('punishment-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.punishment.update).toHaveBeenCalledWith({
        where: { id: 'punishment-1' },
        data: {
          isResolved: true,
          resolvedAt: expect.any(Date),
        },
      });
      expect(mockPrisma.node.update).toHaveBeenCalledWith({
        where: { id: 'node-1' },
        data: { status: NodeStatus.ACTIVE },
      });
    });
  });
});