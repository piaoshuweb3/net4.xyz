import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { GrpcClientService } from './common/grpc/grpc-client.service';
import { GrpcServerService } from './common/grpc/grpc-server.service';
import { DiscoveryService } from './common/discovery/discovery.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly grpcClientService: GrpcClientService,
    private readonly grpcServerService: GrpcServerService,
    private readonly discoveryService: DiscoveryService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async healthCheck() {
    const [grpcClients, grpcServers, discovery] = await Promise.all([
      this.grpcClientService.healthCheck().catch(() => ({ status: 'error', services: {} })),
      this.grpcServerService.healthCheck().catch(() => ({ status: 'error', servers: {} })),
      this.discoveryService.healthCheck().catch(() => ({ status: 'error', services: {} })),
    ]);

    const allHealthy = 
      grpcClients.status !== 'error' && 
      grpcServers.status !== 'error' && 
      discovery.status !== 'error';

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'net4.xyz-backend',
      components: {
        grpcClients,
        grpcServers,
        serviceDiscovery: discovery,
      },
    };
  }
}