import { Test, TestingModule } from '@nestjs/testing';
import { NodeService } from '../node.service';
import { PrismaService } from '../../common/services/prisma.service';
import { NodeType, NodeStatus, AIModelType, PunishmentType } from '@prisma/client';

describe('NodeService', () => {
  let service: NodeService;
  let prisma: PrismaService;

  const mockPrisma = {
    node: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    aITask: {
      aggregate: jest.fn(),
    },
    punishment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    appeal: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodeService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<NodeService>(NodeService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStakeAmount', () => {
    it('should return correct stake amount for CORE nodes', () => {
      expect(service.getStakeAmount(NodeType.CORE)).toBe(100000);
    });

    it('should return correct stake amount for SUB nodes', () => {
      expect(service.getStakeAmount(NodeType.SUB)).toBe(9999);
    });

    it('should return correct stake amount for NORMAL nodes', () => {
      expect(service.getStakeAmount(NodeType.NORMAL)).toBe(9999);
    });
  });

  describe('getNodeLimit', () => {
    it('should return correct limit for CORE nodes', () => {
      expect(service.getNodeLimit(NodeType.CORE)).toBe(21);
    });

    it('should return correct limit for SUB nodes', () => {
      expect(service.getNodeLimit(NodeType.SUB)).toBe(128);
    });

    it('should return correct limit for NORMAL nodes', () => {
      expect(service.getNodeLimit(NodeType.NORMAL)).toBe(10000);
    });
  });

  describe('register', () => {
    const userId = 'user-123';
    const registerInput = {
      nodeType: NodeType.SUB,
      aiModelType: AIModelType.LLAMA_3_70B,
      region: 'US',
      ipAddress: '192.168.1.1',
      hardwareInfo: { cpu: 'AMD Ryzen 9', gpu: 'RTX 4090' },
    };

    it('should throw error if user already has a node', async () => {
      mockPrisma.node.findUnique.mockResolvedValue({ id: 'existing-node' });

      await expect(service.register(userId, registerInput)).rejects.toThrow(
        'User already has a node',
      );
    });

    it('should throw error if node type limit reached', async () => {
      mockPrisma.node.findUnique.mockResolvedValue(null);
      mockPrisma.node.count.mockResolvedValue(128); // SUB node limit

      await expect(service.register(userId, registerInput)).rejects.toThrow(
        'Node type SUB has reached its limit',
      );
    });

    it('should create a new node successfully', async () => {
      mockPrisma.node.findUnique.mockResolvedValue(null);
      mockPrisma.node.count.mockResolvedValue(10);
      mockPrisma.node.create.mockResolvedValue({
        id: 'new-node-id',
        ownerId: userId,
        ...registerInput,
        status: NodeStatus.PENDING,
        stakedAmount: 9999,
      });
      mockPrisma.user.update.mockResolvedValue({ id: userId });

      const result = await service.register(userId, registerInput);

      expect(result).toBeDefined();
      expect(result.id).toBe('new-node-id');
      expect(mockPrisma.node.create).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { nodeId: 'new-node-id' },
      });
    });
  });

  describe('approveNode', () => {
    const nodeId = 'node-123';

    it('should throw error if node not found', async () => {
      mockPrisma.node.findUnique.mockResolvedValue(null);

      await expect(
        service.approveNode(nodeId, { approved: true }),
      ).rejects.toThrow('Node not found');
    });

    it('should throw error if node is not pending', async () => {
      mockPrisma.node.findUnique.mockResolvedValue({
        id: nodeId,
        status: NodeStatus.ACTIVE,
      });

      await expect(
        service.approveNode(nodeId, { approved: true }),
      ).rejects.toThrow('Node is not in pending status');
    });

    it('should approve node successfully', async () => {
      mockPrisma.node.findUnique.mockResolvedValue({
        id: nodeId,
        status: NodeStatus.PENDING,
      });
      mockPrisma.node.update.mockResolvedValue({
        id: nodeId,
        status: NodeStatus.ACTIVE,
        approvedAt: new Date(),
      });

      const result = await service.approveNode(nodeId, { approved: true });

      expect(result.status).toBe(NodeStatus.ACTIVE);
      expect(result.approvedAt).toBeDefined();
    });

    it('should reject node successfully', async () => {
      mockPrisma.node.findUnique.mockResolvedValue({
        id: nodeId,
        status: NodeStatus.PENDING,
      });
      mockPrisma.node.update.mockResolvedValue({
        id: nodeId,
        status: NodeStatus.REJECTED,
        approvedAt: null,
      });

      const result = await service.approveNode(nodeId, { approved: false });

      expect(result.status).toBe(NodeStatus.REJECTED);
    });
  });

  describe('punish', () => {
    const nodeId = 'node-123';

    it('should throw error if node not found', async () => {
      mockPrisma.node.findUnique.mockResolvedValue(null);

      await expect(
        service.punish(nodeId, PunishmentType.OFFLINE, 100, 'Offline for 24h'),
      ).rejects.toThrow('Node not found');
    });

    it('should create punishment and update node status', async () => {
      mockPrisma.node.findUnique.mockResolvedValue({
        id: nodeId,
        status: NodeStatus.ACTIVE,
        stakedAmount: 9999,
      });
      mockPrisma.punishment.create.mockResolvedValue({
        id: 'punishment-1',
        nodeId,
        type: PunishmentType.OFFLINE,
        amount: 100,
        reason: 'Offline for 24h',
      });
      mockPrisma.node.update.mockResolvedValue({
        id: nodeId,
        status: NodeStatus.PUNISHING,
        stakedAmount: 9899,
      });

      const result = await service.punish(
        nodeId,
        PunishmentType.OFFLINE,
        100,
        'Offline for 24h',
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('punishment-1');
      expect(mockPrisma.node.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: nodeId },
          data: expect.objectContaining({
            status: NodeStatus.PUNISHING,
          }),
        }),
      );
    });
  });

  describe('resolvePunishment', () => {
    const punishmentId = 'punishment-123';
    const nodeId = 'node-123';

    it('should throw error if punishment not found', async () => {
      mockPrisma.punishment.findUnique.mockResolvedValue(null);

      await expect(service.resolvePunishment(punishmentId)).rejects.toThrow(
        'Punishment not found',
      );
    });

    it('should resolve punishment and restore node status', async () => {
      mockPrisma.punishment.findUnique.mockResolvedValue({
        id: punishmentId,
        nodeId,
        isResolved: false,
      });
      mockPrisma.punishment.update.mockResolvedValue({
        id: punishmentId,
        isResolved: true,
        resolvedAt: new Date(),
      });
      mockPrisma.node.update.mockResolvedValue({
        id: nodeId,
        status: NodeStatus.ACTIVE,
      });

      const result = await service.resolvePunishment(punishmentId);

      expect(result.success).toBe(true);
      expect(mockPrisma.node.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: nodeId },
          data: { status: NodeStatus.ACTIVE },
        }),
      );
    });
  });

  describe('createAppeal', () => {
    const punishmentId = 'punishment-123';
    const nodeId = 'node-123';

    it('should throw error if punishment not found', async () => {
      mockPrisma.punishment.findUnique.mockResolvedValue(null);

      await expect(
        service.createAppeal(punishmentId, nodeId, 'My node was online'),
      ).rejects.toThrow('Punishment not found');
    });

    it('should throw error if punishment does not belong to node', async () => {
      mockPrisma.punishment.findUnique.mockResolvedValue({
        id: punishmentId,
        nodeId: 'different-node',
      });

      await expect(
        service.createAppeal(punishmentId, nodeId, 'My node was online'),
      ).rejects.toThrow('Punishment does not belong to this node');
    });

    it('should throw error if pending appeal already exists', async () => {
      mockPrisma.punishment.findUnique.mockResolvedValue({
        id: punishmentId,
        nodeId,
      });
      mockPrisma.appeal.findFirst.mockResolvedValue({
        id: 'appeal-1',
        status: 'PENDING',
      });

      await expect(
        service.createAppeal(punishmentId, nodeId, 'My node was online'),
      ).rejects.toThrow('There is already a pending appeal for this punishment');
    });

    it('should create appeal successfully', async () => {
      mockPrisma.punishment.findUnique.mockResolvedValue({
        id: punishmentId,
        nodeId,
      });
      mockPrisma.appeal.findFirst.mockResolvedValue(null);
      mockPrisma.appeal.create.mockResolvedValue({
        id: 'appeal-1',
        punishmentId,
        nodeId,
        reason: 'My node was online',
        status: 'PENDING',
      });

      const result = await service.createAppeal(
        punishmentId,
        nodeId,
        'My node was online',
      );

      expect(result.id).toBe('appeal-1');
      expect(mockPrisma.appeal.create).toHaveBeenCalled();
    });
  });

  describe('reviewAppeal', () => {
    const appealId = 'appeal-123';
    const nodeId = 'node-123';
    const reviewerId = 'user-123';

    it('should throw error if appeal not found', async () => {
      mockPrisma.appeal.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewAppeal(appealId, reviewerId, true, 'Approved'),
      ).rejects.toThrow('Appeal not found');
    });

    it('should throw error if appeal already reviewed', async () => {
      mockPrisma.appeal.findUnique.mockResolvedValue({
        id: appealId,
        nodeId,
        status: 'APPROVED',
      });

      await expect(
        service.reviewAppeal(appealId, reviewerId, true, 'Approved'),
      ).rejects.toThrow('Appeal has already been reviewed');
    });

    it('should approve appeal and restore node stake', async () => {
      const appeal = {
        id: appealId,
        nodeId,
        punishmentId: 'punishment-123',
        status: 'PENDING',
        punishment: { amount: 100 },
      };

      mockPrisma.appeal.findUnique.mockResolvedValue(appeal);
      mockPrisma.appeal.update.mockResolvedValue({
        ...appeal,
        status: 'APPROVED',
        reviewerId,
        reviewComment: 'Approved',
        reviewedAt: new Date(),
      });
      mockPrisma.node.update.mockResolvedValue({});
      mockPrisma.punishment.update.mockResolvedValue({});

      const result = await service.reviewAppeal(
        appealId,
        reviewerId,
        true,
        'Approved',
      );

      expect(result.status).toBe('APPROVED');
      expect(mockPrisma.node.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: nodeId },
          data: expect.objectContaining({
            stakedAmount: { increment: 100 },
            status: NodeStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should reject appeal without restoring stake', async () => {
      const appeal = {
        id: appealId,
        nodeId,
        punishmentId: 'punishment-123',
        status: 'PENDING',
        punishment: { amount: 100 },
      };

      mockPrisma.appeal.findUnique.mockResolvedValue(appeal);
      mockPrisma.appeal.update.mockResolvedValue({
        ...appeal,
        status: 'REJECTED',
        reviewerId,
        reviewComment: 'Rejected',
        reviewedAt: new Date(),
      });

      const result = await service.reviewAppeal(
        appealId,
        reviewerId,
        false,
        'Rejected',
      );

      expect(result.status).toBe('REJECTED');
      // Node stake should not be restored
      expect(mockPrisma.node.update).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return correct node statistics', async () => {
      mockPrisma.node.count
        .mockResolvedValueOnce(150) // total
        .mockResolvedValueOnce(100) // active
        .mockResolvedValueOnce(30) // offline
        .mockResolvedValueOnce(10) // punishing
        .mockResolvedValueOnce(10); // pending

      mockPrisma.node.groupBy.mockResolvedValue([
        { nodeType: NodeType.CORE, _count: 15 },
        { nodeType: NodeType.SUB, _count: 50 },
        { nodeType: NodeType.NORMAL, _count: 85 },
      ]);

      const result = await service.getStats();

      expect(result.total).toBe(150);
      expect(result.active).toBe(100);
      expect(result.offline).toBe(30);
      expect(result.punishing).toBe(10);
      expect(result.pending).toBe(10);
      expect(result.byType).toEqual({
        CORE: 15,
        SUB: 50,
        NORMAL: 85,
      });
    });
  });

  describe('getNodeEarnings', () => {
    const nodeId = 'node-123';

    it('should throw error if node not found', async () => {
      mockPrisma.node.findUnique.mockResolvedValue(null);

      await expect(service.getNodeEarnings(nodeId)).rejects.toThrow(
        'Node not found',
      );
    });

    it('should return correct earnings information', async () => {
      mockPrisma.node.findUnique.mockResolvedValue({
        id: nodeId,
        nodeType: NodeType.SUB,
        stakedAmount: 9999,
        reputation: 100,
      });
      mockPrisma.aITask.aggregate.mockResolvedValue({
        _sum: { reward: 5000 },
        _count: 50,
      });
      mockPrisma.punishment.aggregate.mockResolvedValue({
        _sum: { amount: 200 },
      });

      const result = await service.getNodeEarnings(nodeId);

      expect(result.nodeId).toBe(nodeId);
      expect(result.nodeType).toBe(NodeType.SUB);
      expect(result.stakedAmount).toBe(9999);
      expect(result.reputation).toBe(100);
      expect(result.completedTasks).toBe(50);
      expect(result.totalEarnings).toBe(5000);
      expect(result.totalPenalties).toBe(200);
      expect(result.netEarnings).toBe(4800);
    });
  });

  describe('checkNodeOnline', () => {
    const nodeId = 'node-123';

    it('should return false if node not found', async () => {
      mockPrisma.node.findUnique.mockResolvedValue(null);

      const result = await service.checkNodeOnline(nodeId);
      expect(result).toBe(false);
    });

    it('should return false if node is not active', async () => {
      mockPrisma.node.findUnique.mockResolvedValue({
        id: nodeId,
        status: NodeStatus.OFFLINE,
      });

      const result = await service.checkNodeOnline(nodeId);
      expect(result).toBe(false);
    });

    it('should return true if node is active and recently active', async () => {
      const recentTime = new Date();
      mockPrisma.node.findUnique.mockResolvedValue({
        id: nodeId,
        status: NodeStatus.ACTIVE,
        lastActiveAt: recentTime,
      });

      const result = await service.checkNodeOnline(nodeId);
      expect(result).toBe(true);
    });

    it('should return false and update status if node is offline', async () => {
      const oldTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      mockPrisma.node.findUnique.mockResolvedValue({
        id: nodeId,
        status: NodeStatus.ACTIVE,
        lastActiveAt: oldTime,
      });
      mockPrisma.node.update.mockResolvedValue({
        id: nodeId,
        status: NodeStatus.OFFLINE,
      });

      const result = await service.checkNodeOnline(nodeId);

      expect(result).toBe(false);
      expect(mockPrisma.node.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: nodeId },
          data: { status: NodeStatus.OFFLINE },
        }),
      );
    });
  });

  describe('heartbeat', () => {
    const nodeId = 'node-123';

    it('should throw error if node not found', async () => {
      mockPrisma.node.findUnique.mockResolvedValue(null);

      await expect(service.heartbeat(nodeId)).rejects.toThrow('Node not found');
    });

    it('should update lastActiveAt for active node', async () => {
      mockPrisma.node.findUnique.mockResolvedValue({
        id: nodeId,
        status: NodeStatus.ACTIVE,
      });
      mockPrisma.node.update.mockResolvedValue({
        id: nodeId,
        status: NodeStatus.ACTIVE,
        lastActiveAt: new Date(),
      });

      const result = await service.heartbeat(nodeId);

      expect(result.lastActiveAt).toBeDefined();
    });

    it('should restore offline node to active', async () => {
      mockPrisma.node.findUnique.mockResolvedValue({
        id: nodeId,
        status: NodeStatus.OFFLINE,
      });
      mockPrisma.node.update
        .mockResolvedValueOnce({
          id: nodeId,
          status: NodeStatus.ACTIVE,
        })
        .mockResolvedValueOnce({
          id: nodeId,
          status: NodeStatus.ACTIVE,
          lastActiveAt: new Date(),
        });

      const result = await service.heartbeat(nodeId);

      expect(result.status).toBe(NodeStatus.ACTIVE);
    });
  });
});