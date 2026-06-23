import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ArweaveService } from './arweave.service';
import { ArweaveResolver } from './arweave.resolver';

@Module({
  imports: [ConfigModule],
  providers: [ArweaveService, ArweaveResolver],
  exports: [ArweaveService],
})
export class ArweaveModule {}