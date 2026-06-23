import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { DaService } from './da.service';
import { DaResolver } from './da.resolver';

/**
 * Data Availability Layer Module
 * 
 * Integrates with Celestia or EigenDA for off-chain data storage
 * Requirement 11.1: AFC 主网只存状态根，原始数据扔给 DA 层，降低成本
 */
@Module({
  imports: [
    ConfigModule,
    HttpModule,
  ],
  providers: [DaService, DaResolver],
  exports: [DaService],
})
export class DaModule {}