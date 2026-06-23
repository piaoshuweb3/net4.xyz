import { Module } from '@nestjs/common';
import { CreatorService } from './creator.service';
import { CreatorResolver } from './creator.resolver';
import { IpfsService } from '../common/services/ipfs.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Module({
  providers: [
    CreatorService,
    CreatorResolver,
    IpfsService,
    BlockchainService,
  ],
  exports: [
    CreatorService,
  ],
})
export class CreatorModule {}