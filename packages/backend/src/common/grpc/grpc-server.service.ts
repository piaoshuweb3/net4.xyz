import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join } from 'path';
import { readdirSync, statSync } from 'fs';

interface GrpcServer {
  server: any;
  port: number;
}

@Injectable()
export class GrpcServerService implements OnModuleInit, OnModuleDestroy {
  private servers: Map<string, GrpcServer> = new Map();
  private serviceHandlers: Map<string, Map<string, Function>> = new Map();

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeServers();
  }

  async onModuleDestroy() {
    this.closeAllServers();
  }

  private async initializeServers() {
    // Define available gRPC services
    const services = [
      { name: 'user', port: 50051 },
      { name: 'blockchain', port: 50052 },
      { name: 'payment', port: 50053 },
    ];

    for (const service of services) {
      await this.createServer(service.name, service.port);
    }
  }

  private async createServer(name: string, port: number): Promise<void> {
    try {
      const server = new grpc.Server();
      
      // Load proto file
      const protoPath = join(process.cwd(), 'src/common/proto', `${name}.proto`);
      
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
      
      const service = (proto as any)[packageName]?.[serviceName];
      
      if (service) {
        // Get registered handlers for this service
        const handlers = this.serviceHandlers.get(name);
        
        if (handlers) {
          server.addService(service.service, this.convertHandlers(handlers));
        }
        
        const address = `0.0.0.0:${port}`;
        server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
          if (err) {
            console.error(`❌ Failed to bind gRPC server '${name}':`, err.message);
            return;
          }
          server.start();
          this.servers.set(name, { server, port });
          console.log(`🚀 gRPC server '${name}' listening on ${address}`);
        });
      } else {
        console.warn(`⚠️ gRPC service '${serviceName}' not found in proto`);
      }
    } catch (error) {
      console.error(`❌ Failed to create gRPC server '${name}':`, error.message);
    }
  }

  private convertHandlers(handlers: Map<string, Function>): any {
    const converted: any = {};
    for (const [method, handler] of handlers) {
      converted[method] = handler;
    }
    return converted;
  }

  registerHandler(serviceName: string, methodName: string, handler: Function) {
    if (!this.serviceHandlers.has(serviceName)) {
      this.serviceHandlers.set(serviceName, new Map());
    }
    this.serviceHandlers.get(serviceName)!.set(methodName, handler);
  }

  private closeAllServers() {
    for (const [name, server] of this.servers) {
      try {
        server.server.forceShutdown();
        console.log(`🔌 gRPC server '${name}' stopped`);
      } catch (error) {
        console.error(`Error stopping gRPC server '${name}':`, error);
      }
    }
    this.servers.clear();
  }

  getServer(name: string): any {
    const server = this.servers.get(name);
    if (!server) {
      throw new Error(`gRPC server '${name}' not found`);
    }
    return server.server;
  }

  // Health check for gRPC servers
  async healthCheck(): Promise<{ status: string; servers: Record<string, boolean> }> {
    const servers: Record<string, boolean> = {};
    let allHealthy = true;

    for (const [name, server] of this.servers) {
      try {
        servers[name] = true;
      } catch {
        servers[name] = false;
        allHealthy = false;
      }
    }

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      servers,
    };
  }
}