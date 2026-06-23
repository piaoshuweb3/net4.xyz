import { Module } from '@nestjs/common';
import { ZKMLService } from './zkml.service';
import { ZKMLResolver } from './zkml.resolver';

@Module({
  providers: [ZKMLService, ZKMLResolver],
  exports: [ZKMLService],
})
export class ZKMLModule {}