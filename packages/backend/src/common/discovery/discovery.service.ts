import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface ServiceInstance {
  id: string;
  name: string;
  host: string;
  port: number;
  status: 'healthy' | 'unhealthy' | 'starting';
  metadata: Record<string, any>;
  lastHeartbeat: number;
  version: string;
}

export interface ServiceRegistry {
  name: string;
  instances: Map<string, ServiceInstance>;
  version: string;
}

@Injectable()
export class DiscoveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscoveryService.name);
  private registries: Map<string, ServiceRegistry> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_TIMEOUT = 30000; // 30 seconds

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    await this.initializeServiceRegistry();
    this.startHeartbeatMonitor();
  }

  async onModuleDestroy() {
    this.stopHeartbeatMonitor();
  }

  private async initializeServiceRegistry() {
    // Initialize default services
    const defaultServices = [
      { name: 'user-service', host: 'localhost', port: 50051, version: '1.0.0' },
      { name: 'blockchain-service', host: 'localhost', port: 50052, version: '1.0.0' },
      { name: 'payment-service', host: 'localhost', port: 50053, version: '1.0.0' },
      { name: 'content-service', host: 'localhost', port: 50054, version: '1.0.0' },
      { name: 'node-service', host: 'localhost', port: 50055, version: '1.0.0' },
      { name: 'gateway-service', host: 'localhost', port: 3000, version: '1.0.0' },
    ];

    for (const service of defaultServices) {
      this.registerService(service.name, service.host, service.port, service.version);
    }

    this.logger.log('Service discovery initialized');
  }

  registerService(
    name: string,
    host: string,
    port: number,
    version: string = '1.0.0',
    metadata: Record<string, any> = {},
  ): string {
    const instanceId = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const instance: ServiceInstance = {
      id: instanceId,
      name,
      host,
      port,
      status: 'healthy',
      metadata,
      lastHeartbeat: Date.now(),
      version,
    };

    if (!this.registries.has(name)) {
      this.registries.set(name, {
        name,
        instances: new Map(),
        version,
      });
    }

    this.registries.get(name)!.instances.set(instanceId, instance);
    
    this.eventEmitter.emit('service.registered', {
      serviceName: name,
      instanceId,
      host,
      port,
    });

    this.logger.log(`Service registered: ${name} (${host}:${port})`);
    return instanceId;
  }

  deregisterService(instanceId: string): boolean {
    for (const [name, registry] of this.registries) {
      if (registry.instances.has(instanceId)) {
        const instance = registry.instances.get(instanceId)!;
        registry.instances.delete(instanceId);
        
        this.eventEmitter.emit('service.deregistered', {
          serviceName: name,
          instanceId,
        });
        
        this.logger.log(`Service deregistered: ${name} (${instanceId})`);
        return true;
      }
    }
    return false;
  }

  getService(name: string): ServiceInstance | null {
    const registry = this.registries.get(name);
    if (!registry || registry.instances.size === 0) {
      return null;
    }

    // Return the first healthy instance (simple load balancing)
    for (const instance of registry.instances.values()) {
      if (instance.status === 'healthy') {
        return instance;
      }
    }

    return null;
  }

  getAllInstances(name: string): ServiceInstance[] {
    const registry = this.registries.get(name);
    if (!registry) {
      return [];
    }
    return Array.from(registry.instances.values());
  }

  getAllServices(): string[] {
    return Array.from(this.registries.keys());
  }

  updateHeartbeat(instanceId: string): boolean {
    for (const registry of this.registries.values()) {
      if (registry.instances.has(instanceId)) {
        const instance = registry.instances.get(instanceId)!;
        instance.lastHeartbeat = Date.now();
        instance.status = 'healthy';
        return true;
      }
    }
    return false;
  }

  private startHeartbeatMonitor() {
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, 10000); // Check every 10 seconds
  }

  private stopHeartbeatMonitor() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private checkHeartbeats() {
    const now = Date.now();
    
    for (const [name, registry] of this.registries) {
      for (const [instanceId, instance] of registry.instances) {
        if (now - instance.lastHeartbeat > this.HEARTBEAT_TIMEOUT) {
          instance.status = 'unhealthy';
          this.eventEmitter.emit('service.unhealthy', {
            serviceName: name,
            instanceId,
            lastHeartbeat: instance.lastHeartbeat,
          });
          this.logger.debug(`Service unhealthy: ${name} (${instanceId})`);
        }
      }
    }
  }

  // Health check for service discovery
  async healthCheck(): Promise<{ status: string; services: Record<string, number> }> {
    const services: Record<string, number> = {};
    let totalInstances = 0;

    for (const [name, registry] of this.registries) {
      const healthyInstances = Array.from(registry.instances.values())
        .filter(i => i.status === 'healthy').length;
      services[name] = healthyInstances;
      totalInstances += healthyInstances;
    }

    return {
      status: totalInstances > 0 ? 'healthy' : 'degraded',
      services,
    };
  }
}