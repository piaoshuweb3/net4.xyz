import { Test, TestingModule } from '@nestjs/testing';
import { MembersService } from '../members.service';
import { PrismaService } from '../../common/services/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MemberLevel, PaymentMethod, PaymentStatus } from '@prisma/client';

describe('MembersService', () => {
  let service: MembersService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    memberTransaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('getMemberPrice', () => {
    it('should return correct price for BASIC membership', () => {
      expect(service.getMemberPrice(MemberLevel.BASIC)).toBe(99);
    });

    it('should return correct price for MEDIUM membership', () => {
      expect(service.getMemberPrice(MemberLevel.MEDIUM)).toBe(999);
    });

    it('should return correct price for ADVANCED membership', () => {
      expect(service.getMemberPrice(MemberLevel.ADVANCED)).toBe(9999);
    });

    it('should return 0 for NONE membership', () => {
      expect(service.getMemberPrice(MemberLevel.NONE)).toBe(0);
    });
  });

  describe('getAllMemberPrices', () => {
    it('should return all membership levels except NONE', () => {
      const prices = service.getAllMemberPrices();

      expect(prices).toHaveLength(3);
      expect(prices[0].level).toBe(MemberLevel.BASIC);
      expect(prices[0].price).toBe(99);
      expect(prices[1].level).toBe(MemberLevel.MEDIUM);
      expect(prices[1].price).toBe(999);
      expect(prices[2].level).toBe(MemberLevel.ADVANCED);
      expect(prices[2].price).toBe(9999);
    });

    it('should include benefits for each level', () => {
      const prices = service.getAllMemberPrices();

      expect(prices[0].benefits).toBeDefined();
      expect(prices[0].benefits.length).toBeGreaterThan(0);
    });
  });

  describe('getMemberBenefits', () => {
    it('should return benefits for BASIC level', () => {
      const benefits = service.getMemberBenefits(MemberLevel.BASIC);

      expect(benefits).toContain('基础内容访问（Wiki/Blog/白皮书）');
      expect(benefits).toContain('视频/播客免费观看');
    });

    it('should return benefits for MEDIUM level', () => {
      const benefits = service.getMemberBenefits(MemberLevel.MEDIUM);

      expect(benefits).toContain('高级内容（AFC 代码区/创始成员深度访谈）');
      expect(benefits).toContain('社区提案投票权');
    });

    it('should return benefits for ADVANCED level', () => {
      const benefits = service.getMemberBenefits(MemberLevel.ADVANCED);

      expect(benefits).toContain('火种节点候选资格');
      expect(benefits).toContain('核心治理投票权');
    });

    it('should return basic benefits for NONE level', () => {
      const benefits = service.getMemberBenefits(MemberLevel.NONE);

      expect(benefits).toContain('基础内容访问（Wiki/Blog/白皮书）');
    });
  });

  describe('createMembershipOrder', () => {
    const userId = 'user-123';
    const level = MemberLevel.BASIC;
    const paymentMethod = PaymentMethod.USDT;

    it('should throw BadRequestException for invalid level', async () => {
      await expect(
        service.createMembershipOrder(userId, MemberLevel.NONE, paymentMethod),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create membership order successfully', async () => {
      mockPrisma.memberTransaction.create.mockResolvedValue({
        id: 'order-123',
        userId,
        amount: 99,
        level,
        paymentMethod,
        status: PaymentStatus.PENDING,
        expiresAt: new Date(),
      });

      const result = await service.createMembershipOrder(
        userId,
        level,
        paymentMethod,
      );

      expect(result.orderId).toBe('order-123');
      expect(result.amount).toBe(99);
      expect(result.level).toBe(level);
    });
  });

  describe('verifyMembership', () => {
    const userId = 'user-123';

    it('should return false if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.verifyMembership(userId, MemberLevel.BASIC);

      expect(result).toBe(false);
    });

    it('should return false if membership expired', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        memberLevel: MemberLevel.BASIC,
        memberExpiry: new Date('2020-01-01'),
      });

      const result = await service.verifyMembership(userId, MemberLevel.BASIC);

      expect(result).toBe(false);
    });

    it('should return true if user has required level', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        memberLevel: MemberLevel.ADVANCED,
        memberExpiry: futureDate,
      });

      const result = await service.verifyMembership(userId, MemberLevel.BASIC);

      expect(result).toBe(true);
    });

    it('should return false if user has lower level than required', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        memberLevel: MemberLevel.BASIC,
        memberExpiry: futureDate,
      });

      const result = await service.verifyMembership(userId, MemberLevel.MEDIUM);

      expect(result).toBe(false);
    });

    it('should return false if user has NONE level', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        memberLevel: MemberLevel.NONE,
        memberExpiry: futureDate,
      });

      const result = await service.verifyMembership(userId, MemberLevel.BASIC);

      expect(result).toBe(false);
    });
  });

  describe('upgradeMembership', () => {
    const userId = 'user-123';

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.upgradeMembership(userId, MemberLevel.BASIC),
      ).rejects.toThrow(NotFoundException);
    });

    it('should upgrade membership with new expiry', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        memberLevel: MemberLevel.NONE,
        memberExpiry: null,
      });

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        memberLevel: MemberLevel.BASIC,
        memberExpiry: futureDate,
      });

      const result = await service.upgradeMembership(userId, MemberLevel.BASIC);

      expect(result.level).toBe(MemberLevel.BASIC);
    });

    it('should extend expiry if user already has active membership', async () => {
      const currentExpiry = new Date();
      currentExpiry.setFullYear(currentExpiry.getFullYear() + 1);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        memberLevel: MemberLevel.BASIC,
        memberExpiry: currentExpiry,
      });

      const newExpiry = new Date(currentExpiry);
      newExpiry.setFullYear(newExpiry.getFullYear() + 1);

      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        memberLevel: MemberLevel.MEDIUM,
        memberExpiry: newExpiry,
      });

      const result = await service.upgradeMembership(userId, MemberLevel.MEDIUM);

      expect(result.level).toBe(MemberLevel.MEDIUM);
    });
  });

  describe('getMembershipInfo', () => {
    const userId = 'user-123';

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMembershipInfo(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return membership info with days left', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        memberLevel: MemberLevel.BASIC,
        memberExpiry: futureDate,
      });

      const result = await service.getMembershipInfo(userId);

      expect(result.level).toBe(MemberLevel.BASIC);
      expect(result.isExpired).toBe(false);
      expect(result.daysLeft).toBeGreaterThan(0);
    });

    it('should return expired status if membership expired', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        memberLevel: MemberLevel.BASIC,
        memberExpiry: pastDate,
      });

      const result = await service.getMembershipInfo(userId);

      expect(result.isExpired).toBe(true);
      expect(result.daysLeft).toBe(0);
    });
  });

  describe('canUpgrade', () => {
    const userId = 'user-123';

    it('should return false if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.canUpgrade(userId, MemberLevel.BASIC);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('User not found');
    });

    it('should return false if upgrading to ADVANCED without node', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        memberLevel: MemberLevel.MEDIUM,
        node: null,
      });

      const result = await service.canUpgrade(userId, MemberLevel.ADVANCED);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('需要持有火种 NFT 才能升级为高级会员');
    });

    it('should return false if trying to downgrade', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        memberLevel: MemberLevel.ADVANCED,
        node: { id: 'node-1' },
      });

      const result = await service.canUpgrade(userId, MemberLevel.MEDIUM);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('不能降级会员等级');
    });

    it('should return true if upgrade is allowed', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        memberLevel: MemberLevel.BASIC,
        node: null,
      });

      const result = await service.canUpgrade(userId, MemberLevel.MEDIUM);

      expect(result.allowed).toBe(true);
    });
  });
});