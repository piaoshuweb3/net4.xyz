import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { ContentType, ContentStatus } from '@prisma/client';

@Injectable()
export class RecommendationService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取个性化推荐
   */
  async getPersonalizedRecommendations(
    userId: string,
    limit = 10,
  ) {
    // 获取用户最近浏览的内容标签
    // 简化实现：基于用户创建的内容标签进行推荐
    const userContents = await this.prisma.content.findMany({
      where: { authorId: userId },
      select: { tags: true },
    });

    const userTags = new Set<string>();
    userContents.forEach(c => c.tags.forEach(t => userTags.add(t)));

    // 获取热门内容
    const hotContents = await this.prisma.content.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
        tags: { hasSome: Array.from(userTags) },
      },
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

    // 如果用户没有创建内容，返回热门内容
    if (hotContents.length < limit) {
      const additional = await this.prisma.content.findMany({
        where: {
          status: ContentStatus.PUBLISHED,
          id: { notIn: hotContents.map(c => c.id) },
        },
        take: limit - hotContents.length,
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
      });
      return [...hotContents, ...additional];
    }

    return hotContents;
  }

  /**
   * 获取相关内容推荐（基于标签相似度）
   */
  async getRelatedContent(contentId: string, limit = 5) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { tags: true, type: true, authorId: true },
    });

    if (!content) {
      return [];
    }

    // 查找具有相似标签的内容
    const related = await this.prisma.content.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
        id: { not: contentId },
        OR: [
          { tags: { hasSome: content.tags } },
          { type: content.type },
        ],
      },
      take: limit,
      orderBy: [
        { viewCount: 'desc' },
        { publishedAt: 'desc' },
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

    return related;
  }

  /**
   * 获取相似作者的内容
   */
  async getSimilarAuthorContent(authorId: string, limit = 5) {
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      include: {
        contents: {
          where: { status: ContentStatus.PUBLISHED },
          select: { tags: true, type: true },
        },
      },
    });

    if (!author) {
      return [];
    }

    // 收集作者的内容标签和类型
    const authorTags = new Set<string>();
    const authorTypes = new Set<ContentType>();
    (author.contents ?? []).forEach(c => {
      c.tags.filter((t): t is string => t !== null).forEach(t => authorTags.add(t));
      authorTypes.add(c.type);
    });

    // 查找相似内容
    const similar = await this.prisma.content.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
        authorId: { not: authorId },
        OR: [
          { tags: { hasSome: Array.from(authorTags) } },
          { type: { in: Array.from(authorTypes) } },
        ],
      },
      take: limit,
      orderBy: { viewCount: 'desc' },
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

    return similar;
  }

  /**
   * 获取最新内容
   */
  async getLatestContent(limit = 10, type?: ContentType) {
    const where: any = { status: ContentStatus.PUBLISHED };
    if (type) where.type = type;

    return this.prisma.content.findMany({
      where,
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
    });
  }

  /**
   * 获取编辑精选
   */
  async getFeaturedContent(limit = 5) {
    // 简化实现：返回高互动内容
    return this.prisma.content.findMany({
      where: { status: ContentStatus.PUBLISHED },
      take: limit,
      orderBy: [
        { likeCount: 'desc' },
        { commentCount: 'desc' },
        { viewCount: 'desc' },
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
   * 获取内容统计
   */
  async getContentStats() {
    const [total, published, pending, totalViews, totalLikes] = await Promise.all([
      this.prisma.content.count(),
      this.prisma.content.count({ where: { status: ContentStatus.PUBLISHED } }),
      this.prisma.content.count({ where: { status: ContentStatus.PENDING } }),
      this.prisma.content.aggregate({ _sum: { viewCount: true } }),
      this.prisma.content.aggregate({ _sum: { likeCount: true } }),
    ]);

    return {
      totalContents: total,
      publishedContents: published,
      pendingContents: pending,
      totalViews: totalViews._sum.viewCount || 0,
      totalLikes: totalLikes._sum.likeCount || 0,
    };
  }

  /**
   * 记录用户浏览历史（用于推荐算法）
   */
  async recordView(userId: string, contentId: string) {
    // 简化实现：增加内容浏览量
    // 实际实现可以创建 ViewHistory 表来追踪用户行为
    await this.prisma.content.update({
      where: { id: contentId },
      data: { viewCount: { increment: 1 } },
    });
  }

  /**
   * 记录用户点赞（用于推荐算法）
   */
  async recordLike(userId: string, contentId: string) {
    await this.prisma.content.update({
      where: { id: contentId },
      data: { likeCount: { increment: 1 } },
    });
  }
}