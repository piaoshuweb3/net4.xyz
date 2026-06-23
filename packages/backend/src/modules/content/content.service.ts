import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { IpfsService } from '../common/services/ipfs.service';
import { ContentType, ContentStatus } from '@prisma/client';
import { CreateContentInput, UpdateContentInput, PublishContentInput, ApproveContentInput } from './dto/content.input';

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    private ipfsService: IpfsService,
  ) {}

  /**
   * 创建内容
   */
  async create(authorId: string, input: CreateContentInput) {
    const content = await this.prisma.content.create({
      data: {
        authorId,
        type: input.type as ContentType,
        title: input.title,
        summary: input.summary,
        content: input.content,
        isPremium: input.isPremium || false,
        price: input.price,
        tags: input.tags || [],
        status: ContentStatus.DRAFT,
      },
    });

    return content;
  }

  /**
   * 更新内容
   */
  async update(contentId: string, authorId: string, input: UpdateContentInput) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    if (content.authorId !== authorId) {
      throw new BadRequestException('Not authorized to update this content');
    }

    return this.prisma.content.update({
      where: { id: contentId },
      data: {
        title: input.title,
        summary: input.summary,
        content: input.content,
        isPremium: input.isPremium,
        price: input.price,
        tags: input.tags,
      },
    });
  }

  /**
   * 提交审核
   */
  async submitForReview(contentId: string, authorId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    if (content.authorId !== authorId) {
      throw new BadRequestException('Not authorized');
    }

    return this.prisma.content.update({
      where: { id: contentId },
      data: { status: ContentStatus.PENDING },
    });
  }

  /**
   * 审核内容（管理员）
   */
  async approveContent(contentId: string, input: ApproveContentInput) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    const newStatus = input.approved ? ContentStatus.PUBLISHED : ContentStatus.REJECTED;

    return this.prisma.content.update({
      where: { id: contentId },
      data: {
        status: newStatus,
        publishedAt: input.approved ? new Date() : null,
      },
    });
  }

  /**
   * 发布内容到 IPFS
   */
  async publishToIpfs(contentId: string, authorId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    if (content.authorId !== authorId) {
      throw new BadRequestException('Not authorized');
    }

    // 上传到 IPFS
    const ipfsData = {
      title: content.title,
      summary: content.summary,
      content: content.content,
      author: content.authorId,
      type: content.type,
      tags: content.tags,
      publishedAt: content.publishedAt,
    };

    const ipfsHash = await this.ipfsService.uploadJson(ipfsData);

    // 更新内容
    return this.prisma.content.update({
      where: { id: contentId },
      data: {
        ipfsHash,
        chainHash: ipfsHash, // 使用 IPFS 哈希作为链上存证
      },
    });
  }

  /**
   * 获取内容详情
   */
  async getById(contentId: string, userId?: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        author: {
          select: {
            id: true,
            address: true,
            avatar: true,
            bio: true,
          },
        },
        comments: {
          where: { parentId: null },
          include: {
            author: {
              select: {
                id: true,
                address: true,
                avatar: true,
              },
            },
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    address: true,
                    avatar: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        media: true,
      },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    // 检查用户是否有权限查看付费内容
    if (content.isPremium && userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { memberLevel: true, memberExpiry: true },
      });

      const isMember = user && user.memberLevel !== 'NONE' && 
        (!user.memberExpiry || user.memberExpiry > new Date());

      if (!isMember) {
        // 返回脱敏内容
        return {
          ...content,
          content: '此内容需要会员权限',
          isLocked: true,
        };
      }
    }

    // 增加浏览量
    await this.prisma.content.update({
      where: { id: contentId },
      data: { viewCount: { increment: 1 } },
    });

    return { ...content, isLocked: false };
  }

  /**
   * 获取内容列表
   */
  async getList(
    type?: ContentType,
    status: ContentStatus = ContentStatus.PUBLISHED,
    page = 1,
    limit = 20,
    tag?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { status };
    if (type) where.type = type;
    if (tag) where.tags = { has: tag };

    const [contents, total] = await Promise.all([
      this.prisma.content.findMany({
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
      this.prisma.content.count({ where }),
    ]);

    return {
      items: contents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取待审核内容列表
   */
  async getPendingContents(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [contents, total] = await Promise.all([
      this.prisma.content.findMany({
        where: { status: ContentStatus.PENDING },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: {
              id: true,
              address: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.content.count({ where: { status: ContentStatus.PENDING } }),
    ]);

    return {
      items: contents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 搜索内容
   */
  async search(query: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [contents, total] = await Promise.all([
      this.prisma.content.findMany({
        where: {
          status: ContentStatus.PUBLISHED,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { summary: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
          ],
        },
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
      this.prisma.content.count({
        where: {
          status: ContentStatus.PUBLISHED,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    return {
      items: contents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取热门内容
   */
  async getHotContents(limit = 10) {
    return this.prisma.content.findMany({
      where: { status: ContentStatus.PUBLISHED },
      take: limit,
      orderBy: [
        { viewCount: 'desc' },
        { likeCount: 'desc' },
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
   * 获取内容标签
   */
  async getTags() {
    const contents = await this.prisma.content.findMany({
      where: { status: ContentStatus.PUBLISHED },
      select: { tags: true },
    });

    const tagCounts = new Map<string, number>();
    contents.forEach((content) => {
      content.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 添加评论
   */
  async addComment(contentId: string, authorId: string, text: string, parentId?: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    const comment = await this.prisma.comment.create({
      data: {
        contentId,
        authorId,
        text,
        parentId,
      },
    });

    // 更新评论数
    await this.prisma.content.update({
      where: { id: contentId },
      data: { commentCount: { increment: 1 } },
    });

    return comment;
  }

  /**
   * 点赞内容
   */
  async likeContent(contentId: string, userId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    await this.prisma.content.update({
      where: { id: contentId },
      data: { likeCount: { increment: 1 } },
    });

    return { success: true };
  }

  /**
   * 删除内容
   */
  async delete(contentId: string, userId: string, isAdmin: boolean) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    if (content.authorId !== userId && !isAdmin) {
      throw new BadRequestException('Not authorized to delete this content');
    }

    await this.prisma.content.delete({
      where: { id: contentId },
    });

    return { success: true };
  }

  /**
   * 获取用户内容列表
   */
  async getUserContents(authorId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [contents, total] = await Promise.all([
      this.prisma.content.findMany({
        where: { authorId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.content.count({ where: { authorId } }),
    ]);

    return {
      items: contents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}