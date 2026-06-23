import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { UpdateUserInput, UpdateProfileInput } from './dto/users.input';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * 根据 ID 获取用户
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        node: true,
        contents: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * 根据钱包地址获取用户
   */
  async findByAddress(address: string) {
    const user = await this.prisma.user.findUnique({
      where: { address: address.toLowerCase() },
      include: {
        node: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * 根据邮箱获取用户
   */
  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * 更新用户信息
   */
  async update(id: string, input: UpdateUserInput) {
    return this.prisma.user.update({
      where: { id },
      data: input,
    });
  }

  /**
   * 更新用户资料
   */
  async updateProfile(id: string, input: UpdateProfileInput) {
    return this.prisma.user.update({
      where: { id },
      data: {
        avatar: input.avatar,
        bio: input.bio,
      },
    });
  }

  /**
   * 获取用户列表（分页）
   */
  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

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
          isVerified: true,
          isAdmin: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count(),
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
   * 搜索用户
   */
  async search(query: string, limit = 20) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { address: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { twitter: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        address: true,
        email: true,
        twitter: true,
        memberLevel: true,
        isVerified: true,
      },
    });
  }

  /**
   * 验证用户是否为管理员
   */
  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    return user?.isAdmin ?? false;
  }

  /**
   * 获取用户统计数据
   */
  async getUserStats(userId: string) {
    const [contentCount, transactionCount, memberTransactionCount] = await Promise.all([
      this.prisma.content.count({ where: { authorId: userId } }),
      this.prisma.transaction.count({ where: { userId } }),
      this.prisma.memberTransaction.count({ where: { userId } }),
    ]);

    return {
      contentCount,
      transactionCount,
      memberTransactionCount,
    };
  }
}