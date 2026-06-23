import { Module } from '@nestjs/common';
import { PenaltyService } from './penalty.service';
import { PenaltyResolver } from './penalty.resolver';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  providers: [PenaltyService, PenaltyResolver],
  exports: [PenaltyService],
})
export class PenaltyModule {}