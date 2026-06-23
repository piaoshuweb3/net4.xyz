import { Test, TestingModule } from '@nestjs/testing';
import { CreatorService } from '../creator.service';
import { PrismaService } from '../../common/services/prisma.service';
import { IpfsService } from '../../common/services/ipfs.service';
import { BlockchainService } from '../../blockchain/blockchain.service';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { BookStatus, SaleStatus, TipStatus, RevenueType, RevenueStatus } from '@prisma/client';

// Mock PrismaService
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  book: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  bookSale: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  copyrightNFT: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  copyrightNFTSale: {
    create: jest.fn(),
  },
  tip: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  revenue: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
};

// Mock IpfsService
const mockIpfsService = {
  uploadJson: jest.fn().mockResolvedValue('QmTestHash123'),
};

// Mock BlockchainService
const mockBlockchainService = {
  transfer: jest.fn(),
};

// Mock ConfigService
const mockConfigService = {
  get: jest.fn().mockReturnValue('0x1234567890123456789012345678901234567890'),
};

describe('CreatorService', () => {
  let service: CreatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IpfsService, useValue: mockIpfsService },
        { provide: BlockchainService, useValue: mockBlockchainService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CreatorService>(CreatorService);
    jest.clearAllMocks();
  });

  describe('createBook', () => {
    it('should create a book successfully', async () => {
      const mockUser = {
        id: 'user-1',
        memberLevel: 'BASIC',
        address: '0x123',
      };

      const mockBook = {
        id: 'book-1',
        authorId: 'user-1',
        title: 'Test Book',
        description: 'Test Description',
        content: 'Test Content',
        price: 10,
        royaltyRate: 0.7,
        status: BookStatus.DRAFT,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.book.create.mockResolvedValue(mockBook);

      const result = await service.createBook('user-1', {
        title: 'Test Book',
        description: 'Test Description',
        content: 'Test Content',
        price: 10,
      });

      expect(result).toEqual(mockBook);
      expect(mockPrisma.book.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not a member', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        memberLevel: 'NONE',
      });

      await expect(
        service.createBook('user-1', {
          title: 'Test Book',
          content: 'Test Content',
          price: 10,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('purchaseBook', () => {
    it('should purchase a book and create revenue records', async () => {
      const mockBook = {
        id: 'book-1',
        authorId: 'author-1',
        title: 'Test Book',
        price: 10,
        royaltyRate: 0.7,
        status: BookStatus.PUBLISHED,
        author: {
          id: 'author-1',
          address: '0x456',
        },
      };

      const mockSale = {
        id: 'sale-1',
        bookId: 'book-1',
        buyerId: 'buyer-1',
        amount: 10,
        authorShare: 7,
        platformShare: 3,
        status: SaleStatus.COMPLETED,
      };

      mockPrisma.book.findUnique.mockResolvedValue(mockBook);
      mockPrisma.bookSale.create.mockResolvedValue(mockSale);
      mockPrisma.book.update.mockResolvedValue({});
      mockPrisma.revenue.create.mockResolvedValue({});

      const result = await service.purchaseBook('book-1', 'buyer-1', '0xtest');

      expect(result.authorShare).toBe(7);
      expect(result.platformShare).toBe(3);
      expect(mockPrisma.revenue.create).toHaveBeenCalledTimes(2); // Author + Platform
    });

    it('should throw NotFoundException if book does not exist', async () => {
      mockPrisma.book.findUnique.mockResolvedValue(null);

      await expect(
        service.purchaseBook('book-1', 'buyer-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if book is not published', async () => {
      mockPrisma.book.findUnique.mockResolvedValue({
        id: 'book-1',
        status: BookStatus.DRAFT,
      });

      await expect(
        service.purchaseBook('book-1', 'buyer-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createTip', () => {
    it('should create a tip and revenue record', async () => {
      const mockReceiver = { id: 'receiver-1', address: '0x123' };
      const mockTip = {
        id: 'tip-1',
        receiverId: 'receiver-1',
        giverId: 'giver-1',
        amount: 5,
        status: TipStatus.COMPLETED,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockReceiver);
      mockPrisma.tip.create.mockResolvedValue(mockTip);
      mockPrisma.revenue.create.mockResolvedValue({});

      const result = await service.createTip({
        receiverId: 'receiver-1',
        giverId: 'giver-1',
        amount: 5,
      });

      expect(result).toEqual(mockTip);
      expect(mockPrisma.revenue.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user tips themselves', async () => {
      await expect(
        service.createTip({
          receiverId: 'user-1',
          giverId: 'user-1',
          amount: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createCopyrightNFT', () => {
    it('should create a copyright NFT', async () => {
      const mockBook = {
        id: 'book-1',
        authorId: 'author-1',
        title: 'Test Book',
      };

      const mockNft = {
        id: 'nft-1',
        bookId: 'book-1',
        ownerId: 'author-1',
        tokenId: 'COPYRIGHT-123',
        price: 100,
        royaltyRate: 0.1,
        isListed: true,
      };

      mockPrisma.book.findUnique.mockResolvedValue(mockBook);
      mockPrisma.copyrightNFT.findUnique.mockResolvedValue(null);
      mockPrisma.copyrightNFT.create.mockResolvedValue(mockNft);

      const result = await service.createCopyrightNFT('author-1', {
        bookId: 'book-1',
        price: 100,
      });

      expect(result).toEqual(mockNft);
    });

    it('should throw BadRequestException if NFT already exists', async () => {
      const mockBook = {
        id: 'book-1',
        authorId: 'author-1',
      };

      mockPrisma.book.findUnique.mockResolvedValue(mockBook);
      mockPrisma.copyrightNFT.findUnique.mockResolvedValue({ id: 'nft-1' });

      await expect(
        service.createCopyrightNFT('author-1', {
          bookId: 'book-1',
          price: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserRevenueStats', () => {
    it('should return revenue statistics', async () => {
      const mockRevenues = [
        { type: RevenueType.BOOK_SALE, amount: 100, status: RevenueStatus.SETTLED },
        { type: RevenueType.TIP, amount: 50, status: RevenueStatus.SETTLED },
        { type: RevenueType.BOOK_SALE, amount: 30, status: RevenueStatus.PENDING },
      ];

      mockPrisma.revenue.findMany.mockResolvedValue(mockRevenues);

      const result = await service.getUserRevenueStats('user-1');

      expect(result.totalRevenue).toBe(180);
      expect(result.bookSaleRevenue).toBe(100);
      expect(result.tipRevenue).toBe(50);
      expect(result.settled).toBe(150);
      expect(result.pendingSettlement).toBe(30);
    });
  });

  describe('getHotBooks', () => {
    it('should return hot books', async () => {
      const mockBooks = [
        { id: 'book-1', title: 'Book 1', totalSales: 100, totalRevenue: 1000 },
        { id: 'book-2', title: 'Book 2', totalSales: 50, totalRevenue: 500 },
      ];

      mockPrisma.book.findMany.mockResolvedValue(mockBooks);

      const result = await service.getHotBooks(2);

      expect(result).toEqual(mockBooks);
      expect(mockPrisma.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: BookStatus.PUBLISHED },
          take: 2,
        }),
      );
    });
  });
});