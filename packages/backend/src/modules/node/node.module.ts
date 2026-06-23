import { Module } from '@nestjs/common';
import { NodeService } from './node.service';
import { NodeResolver } from './node.resolver';

@Module({
  providers: [NodeService, NodeResolver],
  exports: [NodeService],
})
export class NodeModule {}