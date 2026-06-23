import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/services/prisma.service';
import { IpfsService } from '../common/services/ipfs.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { 
  BookStatus, 
  BookSale, 
  CopyrightNFT, 
  TipStatus, 
  RevenueType, 
  RevenueStatus,
  SaleStatus 
} from '@prisma/client';
import { 
  CreateBookInput, 
  UpdateBookInput, 
  CreateCopyrightNFTInput,
  CreateTipInput,
  RevenueQueryInput 
} from './dto/creator.input';

// 默认分成比例
const DEFAULT_AUTHOR_ROYALTY_RATE = 0.7; // 作者 70%
const DEFAULT_PLATFORM_ROYALTY_RATE = 0.3; // 平台 30%
const DEFAULT_NFT_ROYALTY_RATE = 0.1; // NFT 转售分成 10%

@Injectable()
export class CreatorService {
  private platformWalletAddress: string;

  constructor(
    private prisma: PrismaService,
    private ipfsService: IpfsService,
    private blockchainService: BlockchainService,
    private configService: ConfigService,
  ) {
    this.platformWalletAddress = this.configService.get('PLATFORM_WALLET_ADDRESS', '');
  }

  // ==================== 书籍出版分成 ====================

  /**
   * 创建书籍
   */
  async createBook(authorId: string, input: CreateBookInput) {
    // 检查用户是否为初级会员或以上
    const user = await this.prisma.user.findUnique({
      where: { id: authorId },
    });

    if (!user || user.memberLevel === 'NONE') {
      throw new ForbiddenException('需要初级会员才能发布书籍');
    }

    const book = await this.prisma.book.create({
      data: {
        authorId,
        title: input.title,
        description: input.description,
        coverImage: input.coverImage,
        content: input.content,
        price: input.price,
        royaltyRate: input.royaltyRate || DEFAULT_AUTHOR_ROYALTY_RATE,
        status: BookStatus.DRAFT,
      },
      include: {
        author: {
          select: {
            id: true,
            address: true,
            avatar: true,
          },
        },
      },
    });

    return book;
  }

  /**
   * 更新书籍
   */
  async updateBook(bookId: string, authorId: string, input: UpdateBookInput) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      throw new NotFoundException('书籍不存在');
    }

    if (book.authorId !== authorId) {
      throw new ForbiddenException('无权限修改此书籍');
    }

    if (book.status === BookStatus.PUBLISHED) {
      throw new BadRequestException('已发布的书籍不能修改');
    }

    return this.prisma.book.update({
      where: { id: bookId },
      data: {
        title: input.title,
        description: input.description,
        coverImage: input.coverImage,
        content: input.content,
        price: input.price,
        royaltyRate: input.royaltyRate,
      },
    });
  }

  /**
   * 提交书籍审核
   */
  async submitBookForReview(bookId: string, authorId: string) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      throw new NotFoundException('书籍不存在');
    }

    if (book.authorId !== authorId) {
      throw new ForbiddenException('无权限操作');
    }

    return this.prisma.book.update({
      where: { id: bookId },
      data: { status: BookStatus.PENDING },
    });
  }

  /**
   * 审核书籍（管理员）
   */
  async approveBook(bookId: string, approved: boolean) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      throw new NotFoundException('书籍不存在');
    }

    const newStatus = approved ? BookStatus.PUBLISHED : BookStatus.REJECTED;

    // 如果审核通过，发布到 IPFS
    let ipfsHash: string | undefined;
    if (approved) {
      const ipfsData = {
        title: book.title,
        description: book.description,
        content: book.content,
        author: book.authorId,
        price: book.price,
        royaltyRate: book.royaltyRate,
        publishedAt: new Date().toISOString(),
      };
      ipfsHash = await this.ipfsService.uploadJson(ipfsData);
    }

    return this.prisma.book.update({
      where: { id: bookId },
      data: {
        status: newStatus,
        ipfsHash,
        publishedAt: approved ? new Date() : null,
      },
    });
  }

  /**
   * 购买书籍
   */
  async purchaseBook(bookId: string, buyerId: string, txHash?: string) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: {
        author: {
          select: {
            id: true,
            address: true,
          },
        },
      },
    });

    if (!book) {
      throw new NotFoundException('书籍不存在');
    }

    if (book.status !== BookStatus.PUBLISHED) {
      throw new BadRequestException('书籍未发布');
    }

    // 计算分成
    const authorShare = book.price * book.royaltyRate;
    const platformShare = book.price * (1 - book.royaltyRate);

    // 创建销售记录
    const sale = await this.prisma.bookSale.create({
      data: {
        bookId,
        buyerId,
        amount: book.price,
        authorShare,
        platformShare,
        txHash,
        status: SaleStatus.COMPLETED,
      },
    });

    // 更新书籍销售统计
    await this.prisma.book.update({
      where: { id: bookId },
      data: {
        totalSales: { increment: 1 },
        totalRevenue: { increment: book.price },
      },
    });

    // 创建作者收益记录
    await this.prisma.revenue.create({
      data: {
        userId: book.authorId,
        type: RevenueType.BOOK_SALE,
        amount: authorShare,
        source: `书籍销售: ${book.title}`,
        sourceId: sale.id,
        txHash,
        status: RevenueStatus.SETTLED,
        settledAt: new Date(),
      },
    });

    // 创建平台收益记录
    if (this.platformWalletAddress) {
      await this.prisma.revenue.create({
        data: {
          userId: 'platform', // 平台收益
          type: RevenueType.BOOK_SALE,
          amount: platformShare,
          source: `书籍销售分成: ${book.title}`,
          sourceId: sale.id,
          txHash,
          status: RevenueStatus.SETTLED,
          settledAt: new Date(),
        },
      });
    }

    return {
      sale,
      authorShare,
      platformShare,
    };
  }

  /**
   * 获取书籍详情
   */
  async getBookById(bookId: string, userId?: string) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: {
        author: {
          select: {
            id: true,
            address: true,
            avatar: true,
          },
        },
        copyrightNft: true,
      },
    });

    if (!book) {
      throw new NotFoundException('书籍不存在');
    }

    // 检查用户是否已购买
    let hasPurchased = false;
    if (userId) {
      const purchase = await this.prisma.bookSale.findFirst({
        where: {
          bookId,
          buyerId: userId,
          status: SaleStatus.COMPLETED,
        },
      });
      hasPurchased = !!purchase;
    }

    return {
      ...book,
      hasPurchased,
    };
  }

  /**
   * 获取书籍列表
   */
  async getBooks(status?: BookStatus, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              address: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.book.count({ where }),
    ]);

    return {
      items: books,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取作者的书籍列表
   */
  async getAuthorBooks(authorId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where: { authorId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.book.count({ where: { authorId } }),
    ]);

    return {
      items: books,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== 内容打赏分成 ====================

  /**
   * 打赏创作者
   */
  async createTip(input: CreateTipInput, txHash?: string) {
    const receiver = await this.prisma.user.findUnique({
      where: { id: input.receiverId },
    });

    if (!receiver) {
      throw new NotFoundException('收款用户不存在');
    }

    if (input.receiverId === input.giverId) {
      throw new BadRequestException('不能打赏自己');
    }

    // 创建打赏记录
    const tip = await this.prisma.tip.create({
      data: {
        receiverId: input.receiverId,
        giverId: input.giverId,
        amount: input.amount,
        message: input.message,
        txHash,
        status: TipStatus.COMPLETED,
      },
    });

    // 创建收益记录
    await this.prisma.revenue.create({
      data: {
        userId: input.receiverId,
        type: RevenueType.TIP,
        amount: input.amount,
        source: '内容打赏',
        sourceId: tip.id,
        txHash,
        status: RevenueStatus.SETTLED,
        settledAt: new Date(),
      },
    });

    return tip;
  }

  /**
   * 获取用户的打赏收入
   */
  async getUserTips(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [tips, total] = await Promise.all([
      this.prisma.tip.findMany({
        where: { 
          receiverId: userId,
          status: TipStatus.COMPLETED,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          giver: {
            select: {
              id: true,
              address: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.tip.count({ 
        where: { 
          receiverId: userId,
          status: TipStatus.COMPLETED,
        } 
      }),
    ]);

    const totalAmount = tips.reduce((sum, tip) => sum + tip.amount, 0);

    return {
      items: tips,
      total,
      totalAmount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== 版权 NFT 化 ====================

  /**
   * 创建版权 NFT
   */
  async createCopyrightNFT(ownerId: string, input: CreateCopyrightNFTInput) {
    const book = await this.prisma.book.findUnique({
      where: { id: input.bookId },
    });

    if (!book) {
      throw new NotFoundException('书籍不存在');
    }

    if (book.authorId !== ownerId) {
      throw new ForbiddenException('只有作者才能创建版权NFT');
    }

    // 检查是否已存在版权NFT
    const existingNft = await this.prisma.copyrightNFT.findUnique({
      where: { bookId: input.bookId },
    });

    if (existingNft) {
      throw new BadRequestException('该书籍已有版权NFT');
    }

    // 生成 Token ID
    const tokenId = `COPYRIGHT-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // 上传版权证书到 IPFS
    const certificateData = {
      bookId: book.id,
      bookTitle: book.title,
      author: book.authorId,
      createdAt: new Date().toISOString(),
      royaltyRate: input.royaltyRate || DEFAULT_NFT_ROYALTY_RATE,
    };
    const ipfsHash = await this.ipfsService.uploadJson(certificateData);

    // 创建版权 NFT 记录
    const copyrightNft = await this.prisma.copyrightNFT.create({
      data: {
        bookId: input.bookId,
        ownerId,
        tokenId,
        ipfsHash,
        price: input.price,
        royaltyRate: input.royaltyRate || DEFAULT_NFT_ROYALTY_RATE,
        isListed: true,
        listedAt: new Date(),
      },
      include: {
        book: true,
        owner: {
          select: {
            id: true,
            address: true,
            avatar: true,
          },
        },
      },
    });

    return copyrightNft;
  }

  /**
   * 列出版权 NFT（上架市场）
   */
  async listCopyrightNFT(nftId: string, ownerId: string, price: number) {
    const nft = await this.prisma.copyrightNFT.findUnique({
      where: { id: nftId },
    });

    if (!nft) {
      throw new NotFoundException('版权NFT不存在');
    }

    if (nft.ownerId !== ownerId) {
      throw new ForbiddenException('无权限操作');
    }

    return this.prisma.copyrightNFT.update({
      where: { id: nftId },
      data: {
        isListed: true,
        price,
        listedAt: new Date(),
      },
    });
  }

  /**
   * 购买版权 NFT
   */
  async purchaseCopyrightNFT(nftId: string, buyerId: string, txHash?: string) {
    const nft = await this.prisma.copyrightNFT.findUnique({
      where: { id: nftId },
      include: {
        book: true,
        owner: {
          select: {
            id: true,
            address: true,
          },
        },
      },
    });

    if (!nft) {
      throw new NotFoundException('版权NFT不存在');
    }

    if (!nft.isListed) {
      throw new BadRequestException('该NFT未上架');
    }

    if (nft.ownerId === buyerId) {
      throw new BadRequestException('不能购买自己的NFT');
    }

    // 计算转售分成
    const royalty = nft.price * nft.royaltyRate;
    const sellerRevenue = nft.price - royalty;

    // 创建销售记录
    const sale = await this.prisma.copyrightNFTSale.create({
      data: {
        nftId,
        sellerId: nft.ownerId,
        buyerId,
        price: nft.price,
        royalty,
        txHash,
        status: SaleStatus.COMPLETED,
      },
    });

    // 更新 NFT 所有权
    await this.prisma.copyrightNFT.update({
      where: { id: nftId },
      data: {
        ownerId: buyerId,
        isListed: false,
        soldAt: new Date(),
      },
    });

    // 创建原所有者收益记录（扣除转售分成）
    await this.prisma.revenue.create({
      data: {
        userId: nft.ownerId,
        type: RevenueType.COPYRIGHT_SALE,
        amount: sellerRevenue,
        source: `版权NFT销售: ${nft.book?.title ?? '未知'}`,
        sourceId: sale.id,
        txHash,
        status: RevenueStatus.SETTLED,
        settledAt: new Date(),
      },
    });

    // 创建转售分成收益记录（给原版权持有者）
    if (royalty > 0) {
      await this.prisma.revenue.create({
        data: {
          userId: nft.ownerId,
          type: RevenueType.ROYALTY,
          amount: royalty,
          source: `版权NFT转售分成: ${nft.book?.title ?? '未知'}`,
          sourceId: sale.id,
          txHash,
          status: RevenueStatus.SETTLED,
          settledAt: new Date(),
        },
      });
    }

    return {
      sale,
      sellerRevenue,
      royalty,
    };
  }

  /**
   * 获取版权 NFT 列表
   */
  async getCopyrightNFTs(includeUnlisted = false, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (!includeUnlisted) {
      where.isListed = true;
    }

    const [nfts, total] = await Promise.all([
      this.prisma.copyrightNFT.findMany({
        where,
        skip,
        take: limit,
        orderBy: { listedAt: 'desc' },
        include: {
          book: true,
          owner: {
            select: {
              id: true,
              address: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.copyrightNFT.count({ where }),
    ]);

    return {
      items: nfts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取版权 NFT 详情
   */
  async getCopyrightNFTById(nftId: string) {
    const nft = await this.prisma.copyrightNFT.findUnique({
      where: { id: nftId },
      include: {
        book: true,
        owner: {
          select: {
            id: true,
            address: true,
            avatar: true,
          },
        },
      },
    });

    if (!nft) {
      throw new NotFoundException('版权NFT不存在');
    }

    return nft;
  }

  // ==================== 收益自动结算 ====================

  /**
   * 获取用户收益统计
   */
  async getUserRevenueStats(userId: string) {
    const revenues = await this.prisma.revenue.findMany({
      where: { userId },
    });

    const stats = {
      totalRevenue: 0,
      bookSaleRevenue: 0,
      copyrightSaleRevenue: 0,
      tipRevenue: 0,
      royaltyRevenue: 0,
      pendingSettlement: 0,
      settled: 0,
      withdrawn: 0,
    };

    revenues.forEach((rev) => {
      stats.totalRevenue += rev.amount;
      
      switch (rev.type) {
        case RevenueType.BOOK_SALE:
          stats.bookSaleRevenue += rev.amount;
          break;
        case RevenueType.COPYRIGHT_SALE:
          stats.copyrightSaleRevenue += rev.amount;
          break;
        case RevenueType.TIP:
          stats.tipRevenue += rev.amount;
          break;
        case RevenueType.ROYALTY:
          stats.royaltyRevenue += rev.amount;
          break;
      }

      switch (rev.status) {
        case RevenueStatus.PENDING:
          stats.pendingSettlement += rev.amount;
          break;
        case RevenueStatus.SETTLED:
          stats.settled += rev.amount;
          break;
        case RevenueStatus.WITHDRAWN:
          stats.withdrawn += rev.amount;
          break;
      }
    });

    return stats;
  }

  /**
   * 获取收益记录列表
   */
  async getRevenues(input: RevenueQueryInput) {
    const page = input.page || 1;
    const limit = input.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (input.userId) where.userId = input.userId;
    if (input.type) where.type = input.type as RevenueType;
    if (input.status) where.status = input.status as RevenueStatus;

    const [revenues, total] = await Promise.all([
      this.prisma.revenue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.revenue.count({ where }),
    ]);

    return {
      items: revenues,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 结算收益（自动）
   */
  async settleRevenue(revenueId: string) {
    const revenue = await this.prisma.revenue.findUnique({
      where: { id: revenueId },
    });

    if (!revenue) {
      throw new NotFoundException('收益记录不存在');
    }

    if (revenue.status !== RevenueStatus.PENDING) {
      throw new BadRequestException('该收益已结算');
    }

    // 更新收益状态
    return this.prisma.revenue.update({
      where: { id: revenueId },
      data: {
        status: RevenueStatus.SETTLED,
        settledAt: new Date(),
      },
    });
  }

  /**
   * 批量结算待结算收益
   */
  async batchSettleRevenues(userId: string) {
    const pendingRevenues = await this.prisma.revenue.findMany({
      where: {
        userId,
        status: RevenueStatus.PENDING,
      },
    });

    if (pendingRevenues.length === 0) {
      return { settled: 0 };
    }

    // 批量更新状态
    await this.prisma.revenue.updateMany({
      where: {
        id: { in: pendingRevenues.map((r) => r.id) },
      },
      data: {
        status: RevenueStatus.SETTLED,
        settledAt: new Date(),
      },
    });

    return { settled: pendingRevenues.length };
  }

  /**
   * 提现收益
   */
  async withdrawRevenue(userId: string, toAddress: string) {
    // 获取已结算但未提现的收益
    const revenues = await this.prisma.revenue.findMany({
      where: {
        userId,
        status: RevenueStatus.SETTLED,
      },
    });

    if (revenues.length === 0) {
      throw new BadRequestException('无可提现收益');
    }

    const totalAmount = revenues.reduce((sum, rev) => sum + rev.amount, 0);

    // TODO: 实现链上转账逻辑
    // const txHash = await this.blockchainService.transfer(toAddress, totalAmount.toString());

    // 更新收益状态
    await this.prisma.revenue.updateMany({
      where: {
        id: { in: revenues.map((r) => r.id) },
      },
      data: {
        status: RevenueStatus.WITHDRAWN,
      },
    });

    return {
      amount: totalAmount,
      // txHash,
    };
  }

  // ==================== 统计接口 ====================

  /**
   * 获取热门书籍
   */
  async getHotBooks(limit = 10) {
    return this.prisma.book.findMany({
      where: { status: BookStatus.PUBLISHED },
      take: limit,
      orderBy: [
        { totalSales: 'desc' },
        { totalRevenue: 'desc' },
      ],
      include: {
        author: {
          select: {
            id: true,
            address: true,
            avatar: true,
          },
        },
      },
    });
  }

  /**
   * 获取创作者排行榜
   */
  async getTopCreators(limit = 10) {
    const books = await this.prisma.book.findMany({
      where: { status: BookStatus.PUBLISHED },
      select: {
        authorId: true,
        totalRevenue: true,
        totalSales: true,
        author: {
          select: {
            id: true,
            address: true,
            avatar: true,
          },
        },
      },
    });

    // 按作者聚合
    const authorStats = new Map();
    books.forEach((book) => {
      const existing = authorStats.get(book.authorId);
      if (existing) {
        existing.totalRevenue += book.totalRevenue;
        existing.totalSales += book.totalSales;
      } else {
        authorStats.set(book.authorId, {
          authorId: book.authorId,
          totalRevenue: book.totalRevenue,
          totalSales: book.totalSales,
          author: book.author,
        });
      }
    });

    return Array.from(authorStats.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  }
}