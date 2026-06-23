import { Module } from '@nestjs/common';
import { DomainService } from './domain.service';
import { DomainResolver } from './domain.resolver';

@Module({
  providers: [DomainService, DomainResolver],
  exports: [DomainService],
})
export class DomainModule {}