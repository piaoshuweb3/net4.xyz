import { Injectable } from '@nestjs/common';
import { GrpcClientService } from '../../common/grpc/grpc-client.service';
import { GrpcServerService } from '../../common/grpc/grpc-server.service';
import { DiscoveryService, ServiceInstance } from '../../common/discovery/discovery.service';

@Injectable()
export class MicroservicesService {
  constructor(
    private readonly grpcClientService: GrpcClientService,
    private readonly grpcServerService: GrpcServerService,
    private readonly discoveryService: DiscoveryService,
  ) {}

  // gRPC Client methods
  async getGrpcClientHealth() {
    return this.grpcClientService.healthCheck();
  }

  getGrpcClient(name: string) {
    return this.grpcClientService.getClient(name);
  }

  // gRPC Server methods
  async getGrpcServerHealth() {
    return this.grpcServerService.healthCheck();
  }

  // Service Discovery methods
  async getServiceDiscoveryHealth() {
    return this.discoveryService.healthCheck();
  }

  getService(name: string): ServiceInstance | null {
    return this.discoveryService.getService(name);
  }

  getAllServices(): string[] {
    return this.discoveryService.getAllServices();
  }

  getAllInstances(name: string): ServiceInstance[] {
    return this.discoveryService.getAllInstances(name);
  }

  registerService(
    name: string,
    host: string,
    port: number,
    version?: string,
    metadata?: Record<string, any>,
  ): string {
    return this.discoveryService.registerService(name, host, port, version, metadata);
  }

  deregisterService(instanceId: string): boolean {
    return this.discoveryService.deregisterService(instanceId);
  }

  // Get all microservices status
  async getAllMicroservicesStatus() {
    const [grpcClients, grpcServers, discovery] = await Promise.all([
      this.getGrpcClientHealth(),
      this.getGrpcServerHealth(),
      this.getServiceDiscoveryHealth(),
    ]);

    return {
      grpcClients,
      grpcServers,
      serviceDiscovery: discovery,
      timestamp: new Date().toISOString(),
    };
  }
}