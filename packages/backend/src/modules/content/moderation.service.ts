import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { ContentStatus } from '@prisma/client';

export enum ModerationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED',
}

export interface ReportContentInput {
  contentId: string;
  reason: string;
  details?: string;
}

export interface ModerateContentInput {
  contentId: string;
  status: ModerationStatus;
  moderatorNote?: string;
}

@Injectable()
export class ModerationService {
  constructor(private prisma: PrismaService) {}

  /**
   * 举报内容
   */
  async reportContent(reporterId: string, input: ReportContentInput) {
    const content = await this.prisma.content.findUnique({
      where: { id: input.contentId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    if (content.authorId === reporterId) {
      throw new BadRequestException('Cannot report your own content');
    }

    // 创建举报记录
    // 注意：需要添加 Report 模型到 Prisma schema
    // 这里简化处理，更新内容状态为 FLAGGED
    const updatedContent = await this.prisma.content.update({
      where: { id: input.contentId },
      data: { status: ContentStatus.PENDING }, // 重新提交审核
    });

    // 记录举报到审计日志
    await this.prisma.auditLog.create({
      data: {
        userId: reporterId,
        action: 'CONTENT_REPORT',
        resource: 'content',
        resourceId: input.contentId,
        details: {
          reason: input.reason,
          details: input.details,
        },
      },
    });

    return {
      success: true,
      message: 'Content has been reported and will be reviewed',
      contentId: input.contentId,
    };
  }

  /**
   * 审核内容（批准/拒绝）
   */
  async moderateContent(moderatorId: string, input: ModerateContentInput) {
    const content = await this.prisma.content.findUnique({
      where: { id: input.contentId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    let newStatus: ContentStatus;
    switch (input.status) {
      case ModerationStatus.APPROVED:
        newStatus = ContentStatus.PUBLISHED;
        break;
      case ModerationStatus.REJECTED:
        newStatus = ContentStatus.REJECTED;
        break;
      case ModerationStatus.FLAGGED:
        newStatus = ContentStatus.PENDING;
        break;
      default:
        newStatus = content.status;
    }

    const updatedContent = await this.prisma.content.update({
      where: { id: input.contentId },
      data: {
        status: newStatus,
        publishedAt: input.status === ModerationStatus.APPROVED ? new Date() : content.publishedAt,
      },
    });

    // 记录审核操作到审计日志
    await this.prisma.auditLog.create({
      data: {
        userId: moderatorId,
        action: 'CONTENT_MODERATION',
        resource: 'content',
        resourceId: input.contentId,
        details: {
          previousStatus: content.status,
          newStatus: newStatus,
          moderatorNote: input.moderatorNote,
        },
      },
    });

    return updatedContent;
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
              avatar: true,
            },
          },
          media: true,
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
   * 获取被举报的内容列表
   */
  async getFlaggedContents(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // 获取最近被标记的内容（通过审计日志）
    const flaggedLogs = await this.prisma.auditLog.findMany({
      where: { action: 'CONTENT_REPORT' },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: { resourceId: true },
    });

    const contentIds = [...new Set(flaggedLogs.map(log => log.resourceId).filter((id): id is string => id !== null))];

    const [contents, total] = await Promise.all([
      this.prisma.content.findMany({
        where: {
          id: { in: contentIds },
          status: { not: ContentStatus.ARCHIVED },
        },
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
      this.prisma.auditLog.count({ where: { action: 'CONTENT_REPORT' } }),
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
   * 批量审核内容
   */
  async batchModerate(moderatorId: string, contentIds: string[], approved: boolean) {
    const newStatus = approved ? ContentStatus.PUBLISHED : ContentStatus.REJECTED;

    const updatedContents = await this.prisma.content.updateMany({
      where: {
        id: { in: contentIds },
        status: ContentStatus.PENDING,
      },
      data: {
        status: newStatus,
        publishedAt: approved ? new Date() : null,
      },
    });

    // 记录批量审核操作
    await this.prisma.auditLog.create({
      data: {
        userId: moderatorId,
        action: 'BATCH_CONTENT_MODERATION',
        resource: 'content',
        details: {
          contentIds,
          approved,
          count: updatedContents.count,
        },
      },
    });

    return {
      success: true,
      count: updatedContents.count,
    };
  }

  /**
   * 获取内容审核统计
   */
  async getModerationStats() {
    const [pending, published, rejected, todayApproved, todayRejected] = await Promise.all([
      this.prisma.content.count({ where: { status: ContentStatus.PENDING } }),
      this.prisma.content.count({ where: { status: ContentStatus.PUBLISHED } }),
      this.prisma.content.count({ where: { status: ContentStatus.REJECTED } }),
      this.prisma.content.count({
        where: {
          status: ContentStatus.PUBLISHED,
          updatedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.content.count({
        where: {
          status: ContentStatus.REJECTED,
          updatedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return {
      pending,
      published,
      rejected,
      todayApproved,
      todayRejected,
    };
  }

  /**
   * 自动内容审核（简化版）
   * 实际实现可以集成 AI 内容审核服务
   */
  async autoModerate(contentId: string): Promise<{ status: ModerationStatus; reason?: string }> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    // 简单的关键词过滤
    const blockedKeywords = ['spam', 'scam', 'illegal', 'prohibited'];
    const contentText = `${content.title} ${content.summary} ${content.content}`.toLowerCase();

    for (const keyword of blockedKeywords) {
      if (contentText.includes(keyword)) {
        await this.prisma.content.update({
          where: { id: contentId },
          data: { status: ContentStatus.REJECTED },
        });

        return {
          status: ModerationStatus.REJECTED,
          reason: `Content contains blocked keyword: ${keyword}`,
        };
      }
    }

    // 内容通过自动审核
    return { status: ModerationStatus.APPROVED };
  }

  /**
   * 归档内容
   */
  async archiveContent(contentId: string, userId: string, isAdmin: boolean) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    if (content.authorId !== userId && !isAdmin) {
      throw new BadRequestException('Not authorized to archive this content');
    }

    return this.prisma.content.update({
      where: { id: contentId },
      data: { status: ContentStatus.ARCHIVED },
    });
  }

  /**
   * 恢复内容（从归档状态）
   */
  async restoreContent(contentId: string, userId: string, isAdmin: boolean) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    if (content.authorId !== userId && !isAdmin) {
      throw new BadRequestException('Not authorized to restore this content');
    }

    return this.prisma.content.update({
      where: { id: contentId },
      data: { status: ContentStatus.DRAFT },
    });
  }
}