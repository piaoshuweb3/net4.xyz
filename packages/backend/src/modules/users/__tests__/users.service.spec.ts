import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from '../../common/services/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    content: {
      count: jest.fn(),
    },
    transaction: {
      count: jest.fn(),
    },
    memberTransaction: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('findById', () => {
    const userId = 'user-123';

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById(userId)).rejects.toThrow(NotFoundException);
    });

    it('should return user if found', async () => {
      const mockUser = {
        id: userId,
        address: '0x123...',
        email: 'test@example.com',
        node: null,
        contents: [],
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById(userId);

      expect(result).toEqual(mockUser);
    });
  });

  describe('findByAddress', () => {
    const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findByAddress(address)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return user with lowercase address', async () => {
      const mockUser = {
        id: 'user-123',
        address: address.toLowerCase(),
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByAddress(address);

      expect(result.address).toBe(address.toLowerCase());
    });
  });

  describe('findByEmail', () => {
    const email = 'test@example.com';

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findByEmail(email)).rejects.toThrow(NotFoundException);
    });

    it('should return user if found', async () => {
      const mockUser = {
        id: 'user-123',
        email,
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail(email);

      expect(result.email).toBe(email);
    });
  });

  describe('update', () => {
    const userId = 'user-123';

    it('should update user successfully', async () => {
      const updateData = { email: 'new@example.com' };
      const updatedUser = {
        id: userId,
        ...updateData,
      };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateData);

      expect(result).toEqual(updatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
      });
    });
  });

  describe('updateProfile', () => {
    const userId = 'user-123';

    it('should update user profile successfully', async () => {
      const profileData = {
        avatar: 'https://example.com/avatar.png',
        bio: 'Hello world',
      };
      const updatedUser = {
        id: userId,
        ...profileData,
      };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(userId, profileData);

      expect(result).toEqual(updatedUser);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        { id: 'user-1', address: '0x111...' },
        { id: 'user-2', address: '0x222...' },
      ];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(2);

      const result = await service.findAll(1, 10);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should handle empty results', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await service.findAll(1, 10);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('search', () => {
    it('should search users by address, email, or twitter', async () => {
      const mockUsers = [
        { id: 'user-1', address: '0x123...', email: 'test@example.com' },
      ];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.search('test');

      expect(result).toEqual(mockUsers);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ address: expect.anything() }),
            ]),
          }),
        }),
      );
    });

    it('should limit search results', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.search('test', 5);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });

  describe('isAdmin', () => {
    const userId = 'user-123';

    it('should return true if user is admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isAdmin: true });

      const result = await service.isAdmin(userId);

      expect(result).toBe(true);
    });

    it('should return false if user is not admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isAdmin: false });

      const result = await service.isAdmin(userId);

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.isAdmin(userId);

      expect(result).toBe(false);
    });
  });

  describe('getUserStats', () => {
    const userId = 'user-123';

    it('should return user statistics', async () => {
      mockPrisma.content.count.mockResolvedValue(5);
      mockPrisma.transaction.count.mockResolvedValue(10);
      mockPrisma.memberTransaction.count.mockResolvedValue(2);

      const result = await service.getUserStats(userId);

      expect(result.contentCount).toBe(5);
      expect(result.transactionCount).toBe(10);
      expect(result.memberTransactionCount).toBe(2);
    });

    it('should return zeros for user with no activity', async () => {
      mockPrisma.content.count.mockResolvedValue(0);
      mockPrisma.transaction.count.mockResolvedValue(0);
      mockPrisma.memberTransaction.count.mockResolvedValue(0);

      const result = await service.getUserStats(userId);

      expect(result.contentCount).toBe(0);
      expect(result.transactionCount).toBe(0);
      expect(result.memberTransactionCount).toBe(0);
    });
  });
});