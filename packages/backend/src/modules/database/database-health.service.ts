import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';

/**
 * DatabaseHealthService - 数据库健康检查服务
 * 监控 MongoDB 集群状态
 */
@Injectable()
export class DatabaseHealthService {
  private readonly logger = new Logger(DatabaseHealthService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 检查主数据库连接状态
   */
  async checkPrimaryConnection(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      await (this.prisma as any).$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } catch (error) {
      this.logger.error('主数据库连接失败', error);
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        error: error.message,
      };
    }
  }

  /**
   * 检查读副本连接状态
   */
  async checkReadReplicaConnection(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      const readClient = this.prisma.getReadClient();
      if (readClient === this.prisma) {
        return {
          status: 'healthy',
          latency: Date.now() - start,
        };
      }
      await (readClient as any).$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } catch (error) {
      this.logger.error('读副本连接失败', error);
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        error: error.message,
      };
    }
  }

  /**
   * 获取数据库集群状态
   */
  async getClusterStatus(): Promise<{
    primary: { status: string; latency: number };
    readReplica: { status: string; latency: number };
    overall: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    const primary = await this.checkPrimaryConnection();
    const readReplica = await this.checkReadReplicaConnection();

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (primary.status === 'unhealthy') {
      overall = 'unhealthy';
    } else if (readReplica.status === 'unhealthy') {
      overall = 'degraded';
    }

    return {
      primary: {
        status: primary.status,
        latency: primary.latency,
      },
      readReplica: {
        status: readReplica.status,
        latency: readReplica.latency,
      },
      overall,
    };
  }

  /**
   * 获取副本集状态
   */
  async getReplicaSetStatus(): Promise<any> {
    try {
      const result = await (this.prisma as any).$queryRaw`
        rs.status()
      `;
      return result;
    } catch (error) {
      this.logger.error('获取副本集状态失败', error);
      return null;
    }
  }
}