import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IpfsService } from './ipfs.service';
import { IpfsResolver } from './ipfs.resolver';

@Module({
  imports: [ConfigModule],
  providers: [IpfsService, IpfsResolver],
  exports: [IpfsService],
})
export class IpfsModule {}