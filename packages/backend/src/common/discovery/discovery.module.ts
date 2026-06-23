import { Module, Global } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';

@Global()
@Module({
  providers: [DiscoveryService],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}