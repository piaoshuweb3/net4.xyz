import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { MemberLevel, ContentStatus, NodeStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ==================== 用户管理 ====================

  /**
   * 获取所有用户（分页）
   */
  async getUsers(page = 1, limit = 20, memberLevel?: MemberLevel, isVerified?: boolean) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (memberLevel) where.memberLevel = memberLevel;
    if (isVerified !== undefined) where.isVerified = isVerified;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          address: true,
          email: true,
          twitter: true,
          memberLevel: true,
          memberExpiry: true,
          isVerified: true,
          isAdmin: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取用户详情
   */
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        node: true,
        contents: { take: 10, orderBy: { createdAt: 'desc' } },
        transactions: { take: 10, orderBy: { createdAt: 'desc' } },
        memberships: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * 更新用户（管理员）
   */
  async updateUser(adminId: string, userId: string, data: {
    email?: string;
    memberLevel?: MemberLevel;
    memberExpiry?: Date;
    isVerified?: boolean;
    isAdmin?: boolean;
  }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    // 记录审计日志
    await this.auditService.log({
      userId: adminId,
      action: 'UPDATE_USER',
      resource: 'user',
      resourceId: userId,
      details: data,
    });

    return updated;
  }

  /**
   * 删除用户
   */
  async deleteUser(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.isAdmin) {
      throw new ForbiddenException('Cannot delete admin user');
    }

    await this.prisma.user.delete({ where: { id: userId } });

    await this.auditService.log({
      userId: adminId,
      action: 'DELETE_USER',
      resource: 'user',
      resourceId: userId,
    });

    return { success: true };
  }

  // ==================== 内容审核 ====================

  /**
   * 获取待审核内容
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
          author: { select: { id: true, address: true, email: true } },
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
   * 审核内容
   */
  async reviewContent(adminId: string, contentId: string, approved: boolean, reason?: string) {
    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw new NotFoundException('Content not found');

    const newStatus = approved ? ContentStatus.PUBLISHED : ContentStatus.REJECTED;

    const updated = await this.prisma.content.update({
      where: { id: contentId },
      data: {
        status: newStatus,
        publishedAt: approved ? new Date() : null,
      },
    });

    await this.auditService.log({
      userId: adminId,
      action: approved ? 'APPROVE_CONTENT' : 'REJECT_CONTENT',
      resource: 'content',
      resourceId: contentId,
      details: { reason },
    });

    return updated;
  }

  /**
   * 删除内容
   */
  async deleteContent(adminId: string, contentId: string) {
    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw new NotFoundException('Content not found');

    await this.prisma.content.delete({ where: { id: contentId } });

    await this.auditService.log({
      userId: adminId,
      action: 'DELETE_CONTENT',
      resource: 'content',
      resourceId: contentId,
    });

    return { success: true };
  }

  // ==================== 财务对账 ====================

  /**
   * 财务对账
   */
  async reconcile(startDate: Date, endDate: Date) {
    const transactions = await this.prisma.memberTransaction.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      include: {
        user: { select: { email: true, address: true } },
      },
    });

    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const byLevel = { BASIC: 0, MEDIUM: 0, ADVANCED: 0 };
    const byPaymentMethod: Record<string, number> = {};

    transactions.forEach((tx) => {
      byLevel[tx.level] += tx.amount;
      byPaymentMethod[tx.paymentMethod] = (byPaymentMethod[tx.paymentMethod] || 0) + tx.amount;
    });

    return {
      period: { startDate, endDate },
      totalTransactions: transactions.length,
      totalAmount,
      byLevel,
      byPaymentMethod,
      transactions: transactions.map((tx) => ({
        id: tx.id,
        userEmail: tx.user?.email,
        userAddress: tx.user?.address,
        amount: tx.amount,
        level: tx.level,
        paymentMethod: tx.paymentMethod,
        txHash: tx.txHash,
        completedAt: tx.updatedAt,
      })),
    };
  }

  /**
   * 获取收入统计
   */
  async getRevenueStats(startDate: Date, endDate: Date) {
    const transactions = await this.prisma.memberTransaction.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
    });

    const dailyRevenue = new Map<string, number>();
    
    transactions.forEach((tx) => {
      const date = tx.createdAt.toISOString().split('T')[0];
      dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + tx.amount);
    });

    return {
      total: transactions.reduce((sum, tx) => sum + tx.amount, 0),
      count: transactions.length,
      daily: Array.from(dailyRevenue.entries()).map(([date, amount]) => ({ date, amount })),
    };
  }

  // ==================== 系统配置 ====================

  /**
   * 获取系统配置
   */
  async getConfig(key: string) {
    const config = await this.prisma.systemConfig.findUnique({ where: { key } });
    return config?.value;
  }

  /**
   * 设置系统配置
   */
  async setConfig(adminId: string, key: string, value: object, description?: string, isPublic = false) {
    const config = await this.prisma.systemConfig.upsert({
      where: { key },
      create: { key, value, description, isPublic },
      update: { value, description, isPublic },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'UPDATE_CONFIG',
      resource: 'system_config',
      resourceId: key,
      details: value,
    });

    return config;
  }

  /**
   * 获取所有系统配置
   */
  async getAllConfigs(includePrivate = false) {
    const where = includePrivate ? {} : { isPublic: true };
    return this.prisma.systemConfig.findMany({ where });
  }

  // ==================== 数据统计 ====================

  /**
   * 获取仪表盘统计
   */
  async getDashboardStats() {
    const [
      totalUsers,
      totalNodes,
      activeNodes,
      totalContents,
      publishedContents,
      pendingContents,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.node.count(),
      this.prisma.node.count({ where: { status: NodeStatus.ACTIVE } }),
      this.prisma.content.count(),
      this.prisma.content.count({ where: { status: ContentStatus.PUBLISHED } }),
      this.prisma.content.count({ where: { status: ContentStatus.PENDING } }),
      this.prisma.memberTransaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    // 获取最近7天的用户注册数
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsersThisWeek = await this.prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    return {
      users: {
        total: totalUsers,
        newThisWeek: newUsersThisWeek,
      },
      nodes: {
        total: totalNodes,
        active: activeNodes,
      },
      contents: {
        total: totalContents,
        published: publishedContents,
        pending: pendingContents,
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
      },
    };
  }

  /**
   * 获取用户增长统计
   */
  async getUserGrowthStats(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
    });

    const dailyUsers = new Map<string, number>();
    
    users.forEach((user) => {
      const date = user.createdAt.toISOString().split('T')[0];
      dailyUsers.set(date, (dailyUsers.get(date) || 0) + 1);
    });

    return Array.from(dailyUsers.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 获取节点统计
   */
  async getNodeStats() {
    const [total, active, offline, punishing, pending] = await Promise.all([
      this.prisma.node.count(),
      this.prisma.node.count({ where: { status: NodeStatus.ACTIVE } }),
      this.prisma.node.count({ where: { status: NodeStatus.OFFLINE } }),
      this.prisma.node.count({ where: { status: NodeStatus.PUNISHING } }),
      this.prisma.node.count({ where: { status: NodeStatus.PENDING } }),
    ]);

    const byType = await this.prisma.node.groupBy({
      by: ['nodeType'],
      _count: true,
    });

    return {
      total,
      active,
      offline,
      punishing,
      pending,
      byType: byType.reduce((acc, item) => {
        acc[item.nodeType] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // ==================== 审计日志 ====================

  /**
   * 获取审计日志
   */
  async getAuditLogs(
    userId?: string,
    action?: string,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}