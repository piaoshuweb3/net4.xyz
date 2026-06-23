import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from '../admin.service';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MemberLevel, ContentStatus, NodeStatus } from '@prisma/client';

describe('AdminService', () => {
  let service: AdminService;
  let prismaService: any;
  let auditService: any;

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    content: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    memberTransaction: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    node: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prismaService = module.get(PrismaService);
    auditService = module.get(AuditService);

    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        { id: '1', address: '0x123', email: 'test@example.com', memberLevel: MemberLevel.BASIC },
        { id: '2', address: '0x456', email: 'test2@example.com', memberLevel: MemberLevel.MEDIUM },
      ];
      
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(2);

      const result = await service.getUsers(1, 20);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by memberLevel when provided', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getUsers(1, 20, MemberLevel.BASIC);

      // The where clause is used in count, not findMany
      expect(mockPrisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ memberLevel: MemberLevel.BASIC }),
        }),
      );
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const mockUser = { id: '1', address: '0x123', email: 'test@example.com' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserById('1');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    it('should update user and log audit', async () => {
      const mockUser = { id: '1', email: 'old@example.com' };
      const updatedUser = { id: '1', email: 'new@example.com' };
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser('admin-id', '1', { email: 'new@example.com' });

      expect(result.email).toBe('new@example.com');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE_USER',
          resource: 'user',
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUser('admin-id', 'non-existent', { email: 'test@example.com' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('should delete user and log audit', async () => {
      const mockUser = { id: '1', isAdmin: false };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.delete.mockResolvedValue(mockUser);

      const result = await service.deleteUser('admin-id', '1');

      expect(result.success).toBe(true);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE_USER',
          resource: 'user',
        }),
      );
    });

    it('should throw ForbiddenException if trying to delete admin', async () => {
      const mockUser = { id: '1', isAdmin: true };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.deleteUser('admin-id', '1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getPendingContents', () => {
    it('should return pending contents', async () => {
      const mockContents = [
        { id: '1', title: 'Test Content', status: ContentStatus.PENDING },
      ];
      
      mockPrisma.content.findMany.mockResolvedValue(mockContents);
      mockPrisma.content.count.mockResolvedValue(1);

      const result = await service.getPendingContents(1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('reviewContent', () => {
    it('should approve content and log audit', async () => {
      const mockContent = { id: '1', status: ContentStatus.PENDING };
      const approvedContent = { id: '1', status: ContentStatus.PUBLISHED };
      
      mockPrisma.content.findUnique.mockResolvedValue(mockContent);
      mockPrisma.content.update.mockResolvedValue(approvedContent);

      const result = await service.reviewContent('admin-id', '1', true);

      expect(result.status).toBe(ContentStatus.PUBLISHED);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'APPROVE_CONTENT',
          resource: 'content',
        }),
      );
    });

    it('should reject content and log audit', async () => {
      const mockContent = { id: '1', status: ContentStatus.PENDING };
      const rejectedContent = { id: '1', status: ContentStatus.REJECTED };
      
      mockPrisma.content.findUnique.mockResolvedValue(mockContent);
      mockPrisma.content.update.mockResolvedValue(rejectedContent);

      const result = await service.reviewContent('admin-id', '1', false);

      expect(result.status).toBe(ContentStatus.REJECTED);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REJECT_CONTENT',
          resource: 'content',
        }),
      );
    });
  });

  describe('reconcile', () => {
    it('should return reconciliation data', async () => {
      const mockTransactions = [
        { id: '1', amount: 100, level: MemberLevel.BASIC, paymentMethod: 'CREDIT_CARD', user: { email: 'test@example.com', address: '0x123' }, updatedAt: new Date() },
      ];
      
      mockPrisma.memberTransaction.findMany.mockResolvedValue(mockTransactions);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const result = await service.reconcile(startDate, endDate);

      expect(result.totalTransactions).toBe(1);
      expect(result.totalAmount).toBe(100);
      expect(result.byLevel.BASIC).toBe(100);
    });
  });

  describe('getConfig', () => {
    it('should return config value', async () => {
      const mockConfig = { key: 'site_name', value: 'net4.xyz' };
      mockPrisma.systemConfig.findUnique.mockResolvedValue(mockConfig);

      const result = await service.getConfig('site_name');

      expect(result).toBe('net4.xyz');
    });

    it('should return undefined for non-existent config', async () => {
      mockPrisma.systemConfig.findUnique.mockResolvedValue(null);

      const result = await service.getConfig('non_existent');

      expect(result).toBeUndefined();
    });
  });

  describe('setConfig', () => {
    it('should create or update config and log audit', async () => {
      const mockConfig = { key: 'site_name', value: 'net4.xyz' };
      mockPrisma.systemConfig.upsert.mockResolvedValue(mockConfig);

      const result = await service.setConfig('admin-id', 'site_name', { value: 'net4.xyz' }, 'Site name', true);

      expect(result.key).toBe('site_name');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE_CONFIG',
          resource: 'system_config',
        }),
      );
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      // Setup sequential mock returns for each count call
      mockPrisma.user.count
        .mockResolvedValueOnce(100)   // totalUsers
        .mockResolvedValueOnce(50)    // totalNodes
        .mockResolvedValueOnce(30)    // activeNodes
        .mockResolvedValueOnce(200)   // totalContents
        .mockResolvedValueOnce(150)   // publishedContents
        .mockResolvedValueOnce(20)    // pendingContents
        .mockResolvedValueOnce(10);   // newUsersThisWeek

      mockPrisma.node.count
        .mockResolvedValueOnce(50)    // totalNodes
        .mockResolvedValueOnce(30);   // activeNodes

      mockPrisma.content.count
        .mockResolvedValueOnce(200)   // totalContents
        .mockResolvedValueOnce(150)   // publishedContents
        .mockResolvedValueOnce(20);   // pendingContents

      mockPrisma.memberTransaction.aggregate.mockResolvedValue({ _sum: { amount: 50000 } });

      const result = await service.getDashboardStats();

      expect(result.users.total).toBe(100);
      expect(result.nodes.total).toBe(50);
      expect(result.nodes.active).toBe(30);
      expect(result.contents.total).toBe(200);
      expect(result.revenue.total).toBe(50000);
    });
  });

  describe('getNodeStats', () => {
    it('should return node statistics', async () => {
      mockPrisma.node.count.mockResolvedValueOnce(100); // total
      mockPrisma.node.count.mockResolvedValueOnce(50);  // active
      mockPrisma.node.count.mockResolvedValueOnce(20);  // offline
      mockPrisma.node.count.mockResolvedValueOnce(5);   // punishing
      mockPrisma.node.count.mockResolvedValueOnce(25);  // pending
      mockPrisma.node.groupBy.mockResolvedValue([
        { nodeType: 'CORE', _count: 10 },
        { nodeType: 'SUB', _count: 30 },
        { nodeType: 'NORMAL', _count: 60 },
      ]);

      const result = await service.getNodeStats();

      expect(result.total).toBe(100);
      expect(result.active).toBe(50);
      expect(result.byType.CORE).toBe(10);
      expect(result.byType.SUB).toBe(30);
      expect(result.byType.NORMAL).toBe(60);
    });
  });
});