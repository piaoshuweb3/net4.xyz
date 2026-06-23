import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';

/**
 * DatabaseService - 数据库操作服务
 * 提供读写分离的便捷方法
 */
@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 用户相关 - 读操作 (使用从节点)
   */
  async findUserById(id: string) {
    return this.prisma.getReadClient().user.findUnique({ where: { id } });
  }

  async findUserByAddress(address: string) {
    return this.prisma.getReadClient().user.findUnique({ where: { address } });
  }

  async findUsers(params: { skip?: number; take?: number; where?: any }) {
    return this.prisma.getReadClient().user.findMany(params);
  }

  /**
   * 用户相关 - 写操作 (使用主节点)
   */
  async createUser(data: any) {
    return this.prisma.getWriteClient().user.create({ data });
  }

  async updateUser(id: string, data: any) {
    return this.prisma.getWriteClient().user.update({
      where: { id },
      data,
    });
  }

  async deleteUser(id: string) {
    return this.prisma.getWriteClient().user.delete({ where: { id } });
  }

  /**
   * 内容相关 - 读操作 (使用从节点)
   */
  async findContentById(id: string) {
    return this.prisma.getReadClient().content.findUnique({ where: { id } });
  }

  async findContents(params: { 
    skip?: number; 
    take?: number; 
    where?: any; 
    orderBy?: any;
  }) {
    return this.prisma.getReadClient().content.findMany(params);
  }

  async findPublishedContents(limit: number = 10) {
    return this.prisma.getReadClient().content.findMany({
      where: { status: 'PUBLISHED' },
      take: limit,
      orderBy: { publishedAt: 'desc' },
    });
  }

  /**
   * 内容相关 - 写操作 (使用主节点)
   */
  async createContent(data: any) {
    return this.prisma.getWriteClient().content.create({ data });
  }

  async updateContent(id: string, data: any) {
    return this.prisma.getWriteClient().content.update({
      where: { id },
      data,
    });
  }

  async deleteContent(id: string) {
    return this.prisma.getWriteClient().content.delete({ where: { id } });
  }

  /**
   * 节点相关 - 读操作 (使用从节点)
   */
  async findNodeById(id: string) {
    return this.prisma.getReadClient().node.findUnique({ where: { id } });
  }

  async findNodesByStatus(status: string) {
    return this.prisma.getReadClient().node.findMany({
      where: { status: status as any },
    });
  }

  async findActiveNodes() {
    return this.prisma.getReadClient().node.findMany({
      where: { status: 'ACTIVE' },
    });
  }

  /**
   * 节点相关 - 写操作 (使用主节点)
   */
  async createNode(data: any) {
    return this.prisma.getWriteClient().node.create({ data });
  }

  async updateNode(id: string, data: any) {
    return this.prisma.getWriteClient().node.update({
      where: { id },
      data,
    });
  }

  /**
   * 交易相关 - 读操作 (使用从节点)
   */
  async findTransactionByHash(hash: string) {
    return this.prisma.getReadClient().transaction.findUnique({ 
      where: { hash } 
    });
  }

  async findTransactionsByUser(userId: string, limit: number = 20) {
    return this.prisma.getReadClient().transaction.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 交易相关 - 写操作 (使用主节点)
   */
  async createTransaction(data: any) {
    return this.prisma.getWriteClient().transaction.create({ data });
  }

  /**
   * 会员交易 - 读操作 (使用从节点)
   */
  async findMemberTransactionsByUser(userId: string) {
    return this.prisma.getReadClient().memberTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 会员交易 - 写操作 (使用主节点)
   */
  async createMemberTransaction(data: any) {
    return this.prisma.getWriteClient().memberTransaction.create({ data });
  }

  /**
   * 批量操作 - 使用事务
   */
  async executeInTransaction<T>(operations: (tx: any) => Promise<T>) {
    return this.prisma.getWriteClient().$transaction(operations);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ primary: boolean; read: boolean }> {
    const result = { primary: false, read: false };

    try {
      await (this.prisma as any).$queryRaw`SELECT 1`;
      result.primary = true;
    } catch (error) {
      this.logger.error('主数据库健康检查失败', error);
    }

    try {
      const readClient = this.prisma.getReadClient();
      if (readClient !== this.prisma) {
        await (readClient as any).$queryRaw`SELECT 1`;
        result.read = true;
      } else {
        result.read = result.primary;
      }
    } catch (error) {
      this.logger.error('读副本健康检查失败', error);
    }

    return result;
  }
}