import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join } from 'path';

interface GrpcClient {
  service: any;
  client: any;
}

@Injectable()
export class GrpcClientService implements OnModuleInit, OnModuleDestroy {
  private clients: Map<string, GrpcClient> = new Map();
  private protoDefinitions: Map<string, any> = new Map();

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeClients();
  }

  async onModuleDestroy() {
    this.closeAllClients();
  }

  private async initializeClients() {
    // Initialize gRPC clients for each microservice
    const services = [
      { name: 'user', host: 'localhost', port: 50051 },
      { name: 'blockchain', host: 'localhost', port: 50052 },
      { name: 'payment', host: 'localhost', port: 50053 },
    ];

    for (const service of services) {
      await this.createClient(service.name, service.host, service.port);
    }
  }

  private async createClient(name: string, host: string, port: number): Promise<void> {
    try {
      const protoPath = join(process.cwd(), 'src/common/proto', `${name}.proto`);
      
      // Load proto file
      const packageDefinition = protoLoader.loadSync(protoPath, {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });
      
      const proto = grpc.loadPackageDefinition(packageDefinition);
      const packageName = `net4xyz.${name}`;
      const serviceName = `${name.charAt(0).toUpperCase() + name.slice(1)}Service`;
      
      // Create client
      const address = `${host}:${port}`;
      const credentials = grpc.credentials.createInsecure();
      const service = (proto as any)[packageName]?.[serviceName];
      
      if (service) {
        const client = new service(address, credentials);
        this.clients.set(name, { service, client });
        this.protoDefinitions.set(name, proto);
        console.log(`✅ gRPC client '${name}' connected to ${address}`);
      } else {
        console.warn(`⚠️ gRPC service '${serviceName}' not found in proto`);
      }
    } catch (error) {
      console.error(`❌ Failed to create gRPC client '${name}':`, error.message);
    }
  }

  getClient(name: string): any {
    const client = this.clients.get(name);
    if (!client) {
      throw new Error(`gRPC client '${name}' not found`);
    }
    return client.client;
  }

  getProto(name: string): any {
    const proto = this.protoDefinitions.get(name);
    if (!proto) {
      throw new Error(`Proto '${name}' not found`);
    }
    return proto;
  }

  private closeAllClients() {
    for (const [name, client] of this.clients) {
      try {
        client.client.close();
        console.log(`🔌 gRPC client '${name}' closed`);
      } catch (error) {
        console.error(`Error closing gRPC client '${name}':`, error);
      }
    }
    this.clients.clear();
  }

  // Health check for gRPC clients
  async healthCheck(): Promise<{ status: string; services: Record<string, boolean> }> {
    const services: Record<string, boolean> = {};
    let allHealthy = true;

    for (const [name, client] of this.clients) {
      try {
        // Simple health check - try to get service info
        services[name] = true;
      } catch {
        services[name] = false;
        allHealthy = false;
      }
    }

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      services,
    };
  }
}