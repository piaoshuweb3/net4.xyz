import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { MemberLevel, PaymentMethod, PaymentStatus } from '@prisma/client';
import { CreateMembershipInput, VerifyMembershipInput } from './dto/members.input';

@Injectable()
export class MembersService {
  // 会员价格配置（USDT/年）
  private readonly MEMBER_PRICES: Record<MemberLevel, number> = {
    [MemberLevel.NONE]: 0,
    [MemberLevel.BASIC]: 99,
    [MemberLevel.MEDIUM]: 999,
    [MemberLevel.ADVANCED]: 9999,
  };

  // 会员权益配置
  private readonly MEMBER_BENEFITS: Record<MemberLevel, string[]> = {
    [MemberLevel.NONE]: [
      '基础内容访问（Wiki/Blog/白皮书）',
      '视频/播客免费观看',
    ],
    [MemberLevel.BASIC]: [
      '基础内容访问（Wiki/Blog/白皮书）',
      '视频/播客免费观看',
      'TG 订阅频道权限',
      '书籍发布权限',
    ],
    [MemberLevel.MEDIUM]: [
      '高级内容（AFC 代码区/创始成员深度访谈）',
      '播客投稿权限',
      '社区提案投票权',
      '包含初级会员所有权益',
    ],
    [MemberLevel.ADVANCED]: [
      '火种节点候选资格',
      '核心治理投票权',
      '线下峰会邀请',
      'Mirrome 内测权限',
      '包含中级会员所有权益',
    ],
  };

  constructor(private prisma: PrismaService) {}

  /**
   * 获取会员价格
   */
  getMemberPrice(level: MemberLevel): number {
    return this.MEMBER_PRICES[level];
  }

  /**
   * 获取所有会员等级价格
   */
  getAllMemberPrices(): { level: MemberLevel; price: number; benefits: string[] }[] {
    return Object.entries(this.MEMBER_PRICES)
      .filter(([level]) => level !== MemberLevel.NONE)
      .map(([level, price]) => ({
        level: level as MemberLevel,
        price,
        benefits: this.MEMBER_BENEFITS[level as MemberLevel],
      }));
  }

  /**
   * 获取会员权益
   */
  getMemberBenefits(level: MemberLevel): string[] {
    return this.MEMBER_BENEFITS[level] || [];
  }

  /**
   * 创建会员订单
   */
  async createMembershipOrder(userId: string, level: MemberLevel, paymentMethod: PaymentMethod) {
    const price = this.getMemberPrice(level);
    
    if (price <= 0) {
      throw new BadRequestException('Invalid membership level');
    }

    // 计算到期时间（1年）
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const order = await this.prisma.memberTransaction.create({
      data: {
        userId,
        amount: price,
        level,
        paymentMethod,
        status: PaymentStatus.PENDING,
        expiresAt,
      },
    });

    return {
      orderId: order.id,
      amount: price,
      level,
      paymentMethod,
      expiresAt,
    };
  }

  /**
   * 验证会员权益
   */
  async verifyMembership(userId: string, requiredLevel: MemberLevel): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        memberLevel: true,
        memberExpiry: true,
      },
    });

    if (!user) {
      return false;
    }

    // 检查会员是否过期
    if (user.memberExpiry && user.memberExpiry < new Date()) {
      return false;
    }

    // 检查会员等级 - NONE 级别无法通过任何验证
    if (user.memberLevel === 'NONE') {
      return false;
    }

    // 检查会员等级
    const levelHierarchy: MemberLevel[] = [MemberLevel.BASIC, MemberLevel.MEDIUM, MemberLevel.ADVANCED];
    const userLevelIndex = levelHierarchy.indexOf(user.memberLevel as MemberLevel);
    const requiredLevelIndex = levelHierarchy.indexOf(requiredLevel);

    return userLevelIndex >= requiredLevelIndex;
  }

  /**
   * 升级会员
   */
  async upgradeMembership(userId: string, newLevel: MemberLevel) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberLevel: true, memberExpiry: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 计算新的到期时间
    let newExpiry: Date;
    if (user.memberExpiry && user.memberExpiry > new Date()) {
      // 续期：在现有到期时间基础上加1年
      newExpiry = new Date(user.memberExpiry);
      newExpiry.setFullYear(newExpiry.getFullYear() + 1);
    } else {
      // 新购：从当前时间加1年
      newExpiry = new Date();
      newExpiry.setFullYear(newExpiry.getFullYear() + 1);
    }

    // 更新用户会员等级
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        memberLevel: newLevel,
        memberExpiry: newExpiry,
      },
    });

    return {
      level: updatedUser.memberLevel,
      expiresAt: updatedUser.memberExpiry,
    };
  }

  /**
   * 处理支付回调
   */
  async handlePaymentCallback(orderId: string, status: PaymentStatus, txHash?: string) {
    const order = await this.prisma.memberTransaction.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // 更新订单状态
    await this.prisma.memberTransaction.update({
      where: { id: orderId },
      data: {
        status,
        txHash,
      },
    });

    // 如果支付成功，升级会员
    if (status === PaymentStatus.COMPLETED) {
      await this.upgradeMembership(order.userId, order.level);
    }

    return { success: status === PaymentStatus.COMPLETED };
  }

  /**
   * 获取用户会员信息
   */
  async getMembershipInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        memberLevel: true,
        memberExpiry: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isExpired = user.memberExpiry ? user.memberExpiry < new Date() : true;
    const daysLeft = user.memberExpiry 
      ? Math.max(0, Math.ceil((user.memberExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      level: user.memberLevel,
      expiresAt: user.memberExpiry,
      isExpired,
      daysLeft,
      benefits: this.getMemberBenefits(user.memberLevel),
    };
  }

  /**
   * 获取会员订单列表
   */
  async getMembershipOrders(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.memberTransaction.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.memberTransaction.count({ where: { userId } }),
    ]);

    return {
      items: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 检查用户是否可以升级到指定等级
   */
  async canUpgrade(userId: string, targetLevel: MemberLevel): Promise<{ allowed: boolean; reason?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberLevel: true, node: true },
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // 高级会员需要持有火种 NFT
    if (targetLevel === MemberLevel.ADVANCED && !user.node) {
      return { allowed: false, reason: '需要持有火种 NFT 才能升级为高级会员' };
    }

    // 不能降级
    const levelHierarchy: MemberLevel[] = [MemberLevel.BASIC, MemberLevel.MEDIUM, MemberLevel.ADVANCED];
    const userLevel = user.memberLevel === MemberLevel.NONE ? MemberLevel.BASIC : user.memberLevel;
    if (levelHierarchy.indexOf(targetLevel) <= levelHierarchy.indexOf(userLevel as MemberLevel)) {
      return { allowed: false, reason: '不能降级会员等级' };
    }

    return { allowed: true };
  }

  /**
   * 获取会员统计数据（管理员）
   */
  async getMemberStatistics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // 获取各等级会员数量
    const [basicCount, mediumCount, advancedCount, noneCount] = await Promise.all([
      this.prisma.user.count({ where: { memberLevel: MemberLevel.BASIC } }),
      this.prisma.user.count({ where: { memberLevel: MemberLevel.MEDIUM } }),
      this.prisma.user.count({ where: { memberLevel: MemberLevel.ADVANCED } }),
      this.prisma.user.count({ where: { memberLevel: MemberLevel.NONE } }),
    ]);

    // 获取30天内新增会员
    const [newBasic, newMedium, newAdvanced] = await Promise.all([
      this.prisma.memberTransaction.count({
        where: {
          level: MemberLevel.BASIC,
          status: PaymentStatus.COMPLETED,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.memberTransaction.count({
        where: {
          level: MemberLevel.MEDIUM,
          status: PaymentStatus.COMPLETED,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.memberTransaction.count({
        where: {
          level: MemberLevel.ADVANCED,
          status: PaymentStatus.COMPLETED,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    // 获取30天内收入
    const revenue30Days = await this.prisma.memberTransaction.aggregate({
      where: {
        status: PaymentStatus.COMPLETED,
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
    });

    // 获取60天内收入（用于环比）
    const revenue60Days = await this.prisma.memberTransaction.aggregate({
      where: {
        status: PaymentStatus.COMPLETED,
        createdAt: { gte: sixtyDaysAgo },
      },
      _sum: { amount: true },
    });

    // 计算环比增长
    const currentRevenue = revenue30Days._sum.amount || 0;
    const previousRevenue = (revenue60Days._sum.amount || 0) - currentRevenue;
    const revenueGrowth = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    // 获取即将到期的会员数量（30天内）
    const expiringIn30Days = await this.prisma.user.count({
      where: {
        memberExpiry: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
        memberLevel: { not: MemberLevel.NONE },
      },
    });

    // 获取活跃会员数（30天内有登录）
    const activeMembers = await this.prisma.user.count({
      where: {
        memberLevel: { not: MemberLevel.NONE },
        updatedAt: { gte: thirtyDaysAgo },
      },
    });

    return {
      totalMembers: basicCount + mediumCount + advancedCount,
      byLevel: {
        basic: basicCount,
        medium: mediumCount,
        advanced: advancedCount,
        none: noneCount,
      },
      newMembersLast30Days: {
        basic: newBasic,
        medium: newMedium,
        advanced: newAdvanced,
        total: newBasic + newMedium + newAdvanced,
      },
      revenue: {
        last30Days: currentRevenue,
        growth: Math.round(revenueGrowth * 100) / 100,
      },
      expiringIn30Days,
      activeMembers,
    };
  }

  /**
   * 获取会员趋势数据（管理员）
   */
  async getMemberTrend(days: number = 30) {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 获取每天的新增会员数据
    const transactions = await this.prisma.memberTransaction.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        createdAt: { gte: startDate },
      },
      select: {
        level: true,
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // 按天聚合数据
    const dailyData: Record<string, { date: string; basic: number; medium: number; advanced: number; revenue: number }> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = { date: dateStr, basic: 0, medium: 0, advanced: 0, revenue: 0 };
    }

    for (const tx of transactions) {
      const dateStr = tx.createdAt.toISOString().split('T')[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].revenue += tx.amount;
        if (tx.level === MemberLevel.BASIC) dailyData[dateStr].basic++;
        if (tx.level === MemberLevel.MEDIUM) dailyData[dateStr].medium++;
        if (tx.level === MemberLevel.ADVANCED) dailyData[dateStr].advanced++;
      }
    }

    return Object.values(dailyData);
  }

  /**
   * 获取会员收入分布（管理员）
   */
  async getMemberRevenueDistribution() {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // 按等级统计年度收入
    const [basicRevenue, mediumRevenue, advancedRevenue] = await Promise.all([
      this.prisma.memberTransaction.aggregate({
        where: {
          level: MemberLevel.BASIC,
          status: PaymentStatus.COMPLETED,
          createdAt: { gte: yearStart },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.memberTransaction.aggregate({
        where: {
          level: MemberLevel.MEDIUM,
          status: PaymentStatus.COMPLETED,
          createdAt: { gte: yearStart },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.memberTransaction.aggregate({
        where: {
          level: MemberLevel.ADVANCED,
          status: PaymentStatus.COMPLETED,
          createdAt: { gte: yearStart },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const total = (basicRevenue._sum.amount || 0) + (mediumRevenue._sum.amount || 0) + (advancedRevenue._sum.amount || 0);

    return {
      basic: {
        revenue: basicRevenue._sum.amount || 0,
        count: basicRevenue._count,
        percentage: total > 0 ? Math.round((basicRevenue._sum.amount || 0) / total * 10000) / 100 : 0,
      },
      medium: {
        revenue: mediumRevenue._sum.amount || 0,
        count: mediumRevenue._count,
        percentage: total > 0 ? Math.round((mediumRevenue._sum.amount || 0) / total * 10000) / 100 : 0,
      },
      advanced: {
        revenue: advancedRevenue._sum.amount || 0,
        count: advancedRevenue._count,
        percentage: total > 0 ? Math.round((advancedRevenue._sum.amount || 0) / total * 10000) / 100 : 0,
      },
      total,
    };
  }
}