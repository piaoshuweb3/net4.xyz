import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Resolver()
export class BlockchainResolver {
  constructor(private blockchainService: BlockchainService) {}

  /**
   * 获取代币余额
   */
  @Query(() => String)
  async getBalance(@Args('address') address: string) {
    return this.blockchainService.getBalance(address);
  }

  /**
   * 转账代币
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async transfer(
    @Args('to') to: string,
    @Args('amount') amount: string,
  ) {
    return this.blockchainService.transfer(to, amount);
  }

  /**
   * 质押 NFT
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async stakeNft(@Args('tokenId') tokenId: number) {
    return this.blockchainService.stakeNft(tokenId);
  }

  /**
   * 解除 NFT 质押
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async unstakeNft(@Args('tokenId') tokenId: number) {
    return this.blockchainService.unstakeNft(tokenId);
  }

  /**
   * 获取 NFT 节点信息
   */
  @Query(() => String)
  async getNodeInfo(@Args('tokenId') tokenId: number) {
    return this.blockchainService.getNodeInfo(tokenId);
  }

  /**
   * 提交 AI 工作证明
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async submitWorkProof(
    @Args('nodeId') nodeId: number,
    @Args('taskHash') taskHash: string,
    @Args('aiResult') aiResult: string,
    @Args('zkProof') zkProof: string,
  ) {
    return this.blockchainService.submitWorkProof(nodeId, taskHash, aiResult, zkProof);
  }

  /**
   * 获取任务详情
   */
  @Query(() => String)
  async getTask(@Args('taskHash') taskHash: string) {
    return this.blockchainService.getTask(taskHash);
  }

  /**
   * 估算 Gas 费用
   */
  @Query(() => String)
  async estimateGas(
    @Args('to') to: string,
    @Args('value') value: string,
  ) {
    return this.blockchainService.estimateGas(to, value);
  }

  /**
   * 获取当前 Gas 价格
   */
  @Query(() => String)
  async getGasPrice() {
    return this.blockchainService.getGasPrice();
  }

  /**
   * 获取当前区块高度
   */
  @Query(() => Number)
  async getBlockNumber() {
    return this.blockchainService.getBlockNumber();
  }

  /**
   * 同步节点数据
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async syncNodeData(@Args('tokenId') tokenId: number) {
    return this.blockchainService.syncNodeData(tokenId);
  }

  /**
   * 同步任务数据
   */
  @Mutation(() => String)
  async syncTaskData(@Args('taskHash') taskHash: string) {
    return this.blockchainService.syncTaskData(taskHash);
  }
}