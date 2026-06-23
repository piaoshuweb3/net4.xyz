import { Resolver, Query, Mutation, Args, ObjectType, Field, Int } from '@nestjs/graphql';
import { BridgeService } from './bridge.service';

/**
 * Cross-Chain Bridge Resolver
 * 
 * GraphQL API for cross-chain bridge operations
 * Requirement 11.3: 实现跨链桥接服务
 */
@Resolver()
export class BridgeResolver {
  constructor(private readonly bridgeService: BridgeService) {}

  // ==================== Queries ====================

  @Query(() => BridgeStats)
  async getBridgeStats(): Promise<BridgeStats> {
    return this.bridgeService.getBridgeStats();
  }

  @Query(() => [String])
  async getSupportedChains(): Promise<string[]> {
    return this.bridgeService.getSupportedChains();
  }

  @Query(() => BridgeConfig)
  async getBridgeConfig(): Promise<BridgeConfig> {
    return this.bridgeService.getConfig();
  }

  @Query(() => TransferStatus)
  async getTransferStatus(
    @Args('transferId') transferId: string,
  ): Promise<TransferStatus> {
    return this.bridgeService.getTransferStatus(transferId);
  }

  @Query(() => FallbackStatus)
  async canUseFallback(
    @Args('transferId') transferId: string,
  ): Promise<FallbackStatus> {
    return this.bridgeService.canUseFallback(transferId);
  }

  // ==================== Mutations ====================

  @Mutation(() => TransferResult)
  async lockAndTransfer(
    @Args('token') token: string,
    @Args('amount') amount: string,
    @Args('recipient') recipient: string,
    @Args('destinationChain') destinationChain: string,
  ): Promise<TransferResult> {
    if (destinationChain !== 'afc' && destinationChain !== 'base') {
      throw new Error('Invalid destination chain. Must be "afc" or "base"');
    }
    
    return this.bridgeService.lockAndTransfer({
      token,
      amount,
      recipient,
      destinationChain: destinationChain as 'afc' | 'base',
    });
  }

  @Mutation(() => CompleteTransferResult)
  async completeTransfer(
    @Args('transferId') transferId: string,
    @Args('sourceTxHash') sourceTxHash: string,
    @Args('destinationChain') destinationChain: string,
  ): Promise<CompleteTransferResult> {
    if (destinationChain !== 'afc' && destinationChain !== 'base') {
      throw new Error('Invalid destination chain. Must be "afc" or "base"');
    }
    
    return this.bridgeService.completeTransfer({
      transferId,
      sourceTxHash,
      destinationChain: destinationChain as 'afc' | 'base',
    });
  }

  @Mutation(() => FallbackResult)
  async executeFallback(
    @Args('transferId') transferId: string,
    @Args('reason') reason: string,
  ): Promise<FallbackResult> {
    if (!['timeout', 'verification_failed', 'relay_failed'].includes(reason)) {
      throw new Error('Invalid fallback reason');
    }
    
    return this.bridgeService.executeFallback({
      transferId,
      reason: reason as 'timeout' | 'verification_failed' | 'relay_failed',
    });
  }

  @Mutation(() => Boolean)
  async verifyBridgeMessage(
    @Args('transferId') transferId: string,
    @Args('sourceTxHash') sourceTxHash: string,
  ): Promise<boolean> {
    return this.bridgeService.verifyMessage(transferId, sourceTxHash);
  }
}

// ==================== GraphQL Types ====================

@ObjectType()
export class BridgeStats {
  @Field(() => Int)
  totalTransfers: number;

  @Field(() => Int)
  pendingTransfers: number;

  @Field(() => Int)
  confirmedTransfers: number;

  @Field(() => Int)
  failedTransfers: number;
}

@ObjectType()
export class BridgeConfig {
  @Field(() => Int)
  baseChainId: number;

  @Field(() => Int)
  afcChainId: number;

  @Field(() => Int)
  messageExpiry: number;

  @Field(() => Int)
  requiredConfirmations: number;

  @Field()
  fallbackEnabled: boolean;
}

@ObjectType()
export class TransferStatus {
  @Field()
  status: 'pending' | 'confirmed' | 'failed' | 'unknown';

  @Field({ nullable: true })
  message?: string;

  @Field(() => Int, { nullable: true })
  confirmations?: number;
}

@ObjectType()
export class FallbackStatus {
  @Field()
  allowed: boolean;

  @Field({ nullable: true })
  reason?: string;

  @Field(() => Int, { nullable: true })
  timeRemaining?: number;
}

@ObjectType()
export class TransferResult {
  @Field()
  transferId: string;

  @Field()
  txHash: string;

  @Field()
  status: 'pending' | 'confirmed' | 'failed';
}

@ObjectType()
export class CompleteTransferResult {
  @Field()
  txHash: string;

  @Field()
  status: 'confirmed' | 'failed';
}

@ObjectType()
export class FallbackResult {
  @Field()
  success: boolean;

  @Field({ nullable: true })
  refundTxHash?: string;

  @Field()
  message: string;
}