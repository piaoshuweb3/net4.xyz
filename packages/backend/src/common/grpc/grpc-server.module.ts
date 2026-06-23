import { Module, Global } from '@nestjs/common';
import { GrpcServerService } from './grpc-server.service';

@Global()
@Module({
  providers: [GrpcServerService],
  exports: [GrpcServerService],
})
export class GrpcServerModule {}