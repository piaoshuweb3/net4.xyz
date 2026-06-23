import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BridgeService } from './bridge.service';
import { BridgeResolver } from './bridge.resolver';
import { DaModule } from '../da/da.module';

/**
 * Cross-Chain Bridge Module
 * 
 * Implements two-way peg bridge for Base ↔ AFC asset transfer
 * Requirement 11.3: 开发双向锚定桥，实现 Base ↔ AFC 资产转移，实现回退机制，实现跨链消息验证
 */
@Module({
  imports: [
    ConfigModule,
    HttpModule,
    DaModule,
  ],
  providers: [BridgeService, BridgeResolver],
  exports: [BridgeService],
})
export class BridgeModule {}