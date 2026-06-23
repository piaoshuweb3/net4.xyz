import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

/**
 * PrismaService - 支持读写分离的数据库服务
 * 写操作使用主节点，读操作优先使用从节点
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // 索引签名 - 允许通过字符串键访问任何模型代理
  [key: string]: any;
  
  private readonly logger = new Logger(PrismaService.name);
  private readClient: PrismaClient | null = null;

  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get('DATABASE_URL') || configService.get('DATABASE_WRITE_URL'),
        },
      },
    });

    // 初始化读副本客户端
    const readUrl = configService.get('DATABASE_READ_URL');
    if (readUrl) {
      this.readClient = new PrismaClient({
        datasources: {
          db: {
            url: readUrl,
          },
        },
      });
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('主数据库连接成功 (MongoDB)');

      if (this.readClient) {
        await this.readClient.$connect();
        this.logger.log('读副本连接成功 (MongoDB)');
      }
    } catch (error) {
      this.logger.error('数据库连接失败', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (this.readClient) {
      await this.readClient.$disconnect();
    }
  }

  /**
   * 获取读副本客户端 (用于读操作，实现读写分离)
   */
  getReadClient(): PrismaClient {
    if (!this.readClient) {
      this.logger.warn('读副本未配置，使用主数据库');
      return this;
    }
    return this.readClient;
  }

  /**
   * 获取主数据库客户端 (用于写操作)
   */
  getWriteClient(): PrismaClient {
    return this;
  }

  /**
   * 智能选择数据库客户端
   * - 写操作 (create, update, delete) 使用主节点
   * - 读操作 (find, findMany, findUnique) 使用从节点
   */
  getClient(isWriteOperation: boolean = false): PrismaClient {
    if (isWriteOperation) {
      return this.getWriteClient();
    }
    return this.getReadClient();
  }
}