import { Resolver, Query, Mutation, Args, ObjectType, Field, Int } from '@nestjs/graphql';
import { MicroservicesService } from './microservices.service';

@ObjectType()
export class GrpcClientStatus {
  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  services?: string;
}

@ObjectType()
export class GrpcServerStatus {
  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  servers?: string;
}

@ObjectType()
export class ServiceDiscoveryStatus {
  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  services?: string;
}

@ObjectType()
export class MicroservicesStatus {
  @Field(() => GrpcClientStatus)
  grpcClients: GrpcClientStatus;

  @Field(() => GrpcServerStatus)
  grpcServers: GrpcServerStatus;

  @Field(() => ServiceDiscoveryStatus)
  serviceDiscovery: ServiceDiscoveryStatus;

  @Field(() => String)
  timestamp: string;
}

@ObjectType()
export class ServiceInstanceGql {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  host: string;

  @Field(() => Int)
  port: number;

  @Field(() => String)
  status: string;

  @Field(() => String)
  version: string;
}

@ObjectType()
export class ServiceListItem {
  @Field(() => String)
  name: string;

  @Field(() => [ServiceInstanceGql])
  instances: ServiceInstanceGql[];
}

@Resolver(() => 'Microservices')
export class MicroservicesResolver {
  constructor(private readonly microservicesService: MicroservicesService) {}

  @Query(() => MicroservicesStatus)
  async microservicesStatus() {
    return this.microservicesService.getAllMicroservicesStatus();
  }

  @Query(() => [String])
  async availableServices() {
    return this.microservicesService.getAllServices();
  }

  @Query(() => [ServiceListItem])
  async servicesList() {
    const serviceNames = this.microservicesService.getAllServices();
    return serviceNames.map(name => ({
      name,
      instances: this.microservicesService.getAllInstances(name).map(i => ({
        id: i.id,
        name: i.name,
        host: i.host,
        port: i.port,
        status: i.status,
        version: i.version,
      })),
    }));
  }

  @Query(() => ServiceInstanceGql, { nullable: true })
  async getService(@Args('name') name: string) {
    const instance = this.microservicesService.getService(name);
    if (!instance) return null;
    return {
      id: instance.id,
      name: instance.name,
      host: instance.host,
      port: instance.port,
      status: instance.status,
      version: instance.version,
    };
  }

  @Mutation(() => String)
  async registerService(
    @Args('name') name: string,
    @Args('host') host: string,
    @Args('port') port: number,
    @Args('version', { nullable: true }) version?: string,
  ) {
    return this.microservicesService.registerService(name, host, port, version);
  }

  @Mutation(() => Boolean)
  async deregisterService(@Args('instanceId') instanceId: string) {
    return this.microservicesService.deregisterService(instanceId);
  }
}