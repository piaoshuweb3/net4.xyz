import { Module, Global } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';

/**
 * DatabaseModule - 数据库模块
 * 提供读写分离的数据库访问支持
 * 
 * 使用方式:
 * - 写操作: prismaService.getWriteClient().user.create(...)
 * - 读操作: prismaService.getReadClient().user.findMany(...)
 * - 智能选择: prismaService.getClient(isWriteOperation).user.findUnique(...)
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}