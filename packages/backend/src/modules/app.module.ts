import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { join } from 'path';

import { AppController } from '../app.controller';
import { AppService } from '../app.service';

// Core Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MembersModule } from './members/members.module';
import { PaymentModule } from './payment/payment.module';
import { ComplianceModule } from './compliance/compliance.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { ContentModule } from './content/content.module';
import { NodeModule } from './node/node.module';
import { DomainModule } from './domain/domain.module';
import { AdminModule } from './admin/admin.module';
import { ZKMLModule } from './zkml/zkml.module';
import { PenaltyModule } from './penalty/penalty.module';
import { IpfsModule } from './ipfs/ipfs.module';
import { ArweaveModule } from './arweave/arweave.module';
import { DaModule } from './da/da.module';
import { BridgeModule } from './bridge/bridge.module';
import { CommonModule } from './common/common.module';
import { GatewayModule } from './gateway/gateway.module';
import { DatabaseModule } from './database/database.module';
import { CreatorModule } from './creator/creator.module';
import { TaskModule } from './task/task.module';

// gRPC and Service Discovery Modules
import { GrpcClientModule } from '../common/grpc/grpc-client.module';
import { GrpcServerModule } from '../common/grpc/grpc-server.module';
import { DiscoveryModule } from '../common/discovery/discovery.module';
import { MicroservicesModule } from './microservices/microservices.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 事件发射器模块
    EventEmitterModule.forRoot(),

    // GraphQL 模块
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      context: ({ req }) => ({ req }),
    }),

    // 限流模块
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // gRPC 和服务发现模块
    GrpcClientModule,
    GrpcServerModule,
    DiscoveryModule,

    // 核心业务模块
    CommonModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    MembersModule,
    PaymentModule,
    ComplianceModule,
    BlockchainModule,
    ContentModule,
    NodeModule,
    DomainModule,
    AdminModule,
    ZKMLModule,
    PenaltyModule,
    IpfsModule,
    ArweaveModule,
    DaModule,
    BridgeModule,
    MicroservicesModule,
    CreatorModule,
    TaskModule,

    // API Gateway
    GatewayModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}