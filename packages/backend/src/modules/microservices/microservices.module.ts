import { Module } from '@nestjs/common';
import { MicroservicesResolver } from './microservices.resolver';
import { MicroservicesService } from './microservices.service';

@Module({
  providers: [MicroservicesResolver, MicroservicesService],
  exports: [MicroservicesService],
})
export class MicroservicesModule {}