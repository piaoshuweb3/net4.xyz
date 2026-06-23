import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { DatabaseService } from './database.service';
import { DatabaseHealthService } from './database-health.service';

/**
 * DatabaseController - 数据库监控控制器
 * 提供数据库健康检查和状态查询接口
 */
@Controller('database')
export class DatabaseController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly healthService: DatabaseHealthService,
  ) {}

  /**
   * 健康检查端点
   */
  @Get('health')
  async healthCheck(@Res() res: Response) {
    const health = await this.databaseService.healthCheck();
    const status = health.primary && health.read 
      ? HttpStatus.OK 
      : health.primary 
        ? HttpStatus.OK  // 降级模式仍返回200
        : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(status).json({
      status: health.primary && health.read ? 'healthy' : 'degraded',
      primary: health.primary,
      read: health.read,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 集群状态端点
   */
  @Get('cluster-status')
  async getClusterStatus(@Res() res: Response) {
    const status = await this.healthService.getClusterStatus();
    const httpStatus = status.overall === 'unhealthy' 
      ? HttpStatus.SERVICE_UNAVAILABLE 
      : status.overall === 'degraded' 
        ? HttpStatus.OK 
        : HttpStatus.OK;

    return res.status(httpStatus).json(status);
  }

  /**
   * 副本集状态端点
   */
  @Get('replica-status')
  async getReplicaStatus(@Res() res: Response) {
    const status = await this.healthService.getReplicaSetStatus();
    return res.status(HttpStatus.OK).json(status || { message: '无法获取副本集状态' });
  }
}