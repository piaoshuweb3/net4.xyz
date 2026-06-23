import { Resolver, Query, Mutation, Args, ObjectType, Field, Int, Float, InputType } from '@nestjs/graphql';
import { DaService } from './da.service';

// ==================== Input Types (must be defined before use in decorators) ====================

@InputType()
export class DaIdentifierInput {
  @Field({ nullable: true })
  txHash?: string;

  @Field({ nullable: true })
  blobKey?: string;

  @Field({ nullable: true })
  namespace?: string;
}

@InputType()
export class DaSubmitOptions {
  @Field({ nullable: true })
  namespace?: string;

  @Field({ nullable: true })
  priority?: 'high' | 'normal' | 'low';

  @Field({ nullable: true })
  expiry?: number;
}

@InputType()
export class StateRootMetadataInput {
  @Field({ nullable: true })
  blockNumber?: number;

  @Field({ nullable: true })
  timestamp?: number;

  @Field(() => [String], { nullable: true })
  validatorSet?: string[];
}

// ==================== Response Types ====================

@ObjectType()
export class DaStatusResponse {
  @Field()
  ready: boolean;

  @Field()
  provider: string;
}

@ObjectType()
export class CostEstimateResponse {
  @Field(() => Object)
  celestia: { estimatedCost: string; duration: string };

  @Field(() => Object)
  eigenda: { estimatedCost: string; duration: string };
}

@ObjectType()
export class VerifyDataResponse {
  @Field()
  verified: boolean;

  @Field()
  provider: string;
}

@ObjectType()
export class SubmitDataResponse {
  @Field()
  provider: string;

  @Field({ nullable: true })
  txHash?: string;

  @Field({ nullable: true })
  blobKey?: string;

  @Field({ nullable: true })
  height?: number;

  @Field({ nullable: true })
  namespace?: string;
}

@ObjectType()
export class StoreStateRootResponse {
  @Field()
  provider: string;

  @Field({ nullable: true })
  txHash?: string;

  @Field({ nullable: true })
  blobKey?: string;

  @Field({ nullable: true })
  height?: number;
}

@ObjectType()
export class StateRootResponse {
  @Field()
  root: string;

  @Field()
  blockNumber: number;

  @Field()
  timestamp: number;
}

/**
 * Data Availability Layer GraphQL Resolver
 * Provides API for DA operations
 */
@Resolver()
export class DaResolver {
  constructor(private readonly daService: DaService) {}

  // ==================== Queries ====================

  @Query(() => DaStatusResponse)
  async getDaStatus(): Promise<{ ready: boolean; provider: string }> {
    return {
      ready: this.daService.isReady(),
      provider: this.daService.getProvider(),
    };
  }

  @Query(() => CostEstimateResponse)
  async estimateStorageCost(
    @Args('dataSize', { type: () => Int }) dataSize: number,
  ): Promise<{
    celestia: { estimatedCost: string; duration: string };
    eigenda: { estimatedCost: string; duration: string };
  }> {
    return this.daService.estimateCost(dataSize);
  }

  @Query(() => String)
  async getRecommendedProvider(
    @Args('dataSize', { type: () => Int }) dataSize: number,
    @Args('priority') priority: 'speed' | 'cost' | 'reliability',
  ): Promise<string> {
    return this.daService.getRecommendedProvider(dataSize, priority);
  }

  @Query(() => VerifyDataResponse)
  async verifyDaData(
    @Args('identifier') identifier: DaIdentifierInput,
  ): Promise<{ verified: boolean; provider: string }> {
    const verified = await this.daService.verifyData(identifier);
    return {
      verified,
      provider: this.daService.getProvider(),
    };
  }

  @Query(() => StateRootResponse, { nullable: true })
  async getStateRoot(
    @Args('identifier') identifier: DaIdentifierInput,
  ): Promise<{ root: string; blockNumber: number; timestamp: number } | null> {
    try {
      return await this.daService.retrieveStateRoot(identifier);
    } catch {
      return null;
    }
  }

  // ==================== Mutations ====================

  @Mutation(() => SubmitDataResponse)
  async submitToDa(
    @Args('data', { type: () => String }) data: string,
    @Args('options', { nullable: true }) options?: DaSubmitOptions,
  ): Promise<{
    provider: string;
    txHash?: string;
    blobKey?: string;
    height?: number;
    namespace?: string;
  }> {
    const buffer = Buffer.from(data, 'utf-8');
    return this.daService.submitData(buffer, options);
  }

  @Mutation(() => String)
  async retrieveFromDa(
    @Args('identifier') identifier: DaIdentifierInput,
  ): Promise<string> {
    const data = await this.daService.retrieveData(identifier);
    return data.toString('utf-8');
  }

  @Mutation(() => StoreStateRootResponse)
  async storeStateRoot(
    @Args('stateRoot') stateRoot: string,
    @Args('metadata', { nullable: true }) metadata?: StateRootMetadataInput,
  ): Promise<{
    provider: string;
    txHash?: string;
    blobKey?: string;
    height?: number;
  }> {
    return this.daService.storeStateRoot(stateRoot, metadata);
  }
}
