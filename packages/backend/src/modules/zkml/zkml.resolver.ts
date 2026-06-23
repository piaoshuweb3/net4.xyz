import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ZKMLService } from './zkml.service';
import { 
  GenerateProofInput, 
  VerifyProofInput, 
  SubmitWorkProofInput,
  EmotionalConsensusInput,
  AntiCheatCheckInput 
} from './dto/zkml.input';
import { 
  ZKProofResponse, 
  VerificationResultResponse,
  WorkProofResponse,
  EmotionalConsensusResponse,
  AntiCheatResponse,
  ZKMLStatsResponse 
} from './dto/zkml.response';
import { AuthGuard } from '../auth/guards/auth.guard';

@Resolver()
export class ZKMLResolver {
  constructor(private zkmlService: ZKMLService) {}

  /**
   * 生成 ZK 证明
   */
  @Mutation(() => ZKProofResponse)
  @UseGuards(AuthGuard)
  async generateZKProof(@Args('input') input: GenerateProofInput) {
    return this.zkmlService.generateProof(input);
  }

  /**
   * 验证 ZK 证明
   */
  @Mutation(() => VerificationResultResponse)
  @UseGuards(AuthGuard)
  async verifyZKProof(@Args('input') input: VerifyProofInput) {
    return this.zkmlService.verifyProof(input);
  }

  /**
   * 提交工作证明
   */
  @Mutation(() => WorkProofResponse)
  @UseGuards(AuthGuard)
  async submitWorkProof(@Args('input') input: SubmitWorkProofInput) {
    return this.zkmlService.submitWorkProof(input);
  }

  /**
   * 情感共识验证
   */
  @Query(() => EmotionalConsensusResponse)
  async emotionalConsensus(@Args('input') input: EmotionalConsensusInput) {
    return this.zkmlService.emotionalConsensus(input);
  }

  /**
   * 防作弊检测
   */
  @Mutation(() => AntiCheatResponse)
  @UseGuards(AuthGuard)
  async antiCheatCheck(@Args('input') input: AntiCheatCheckInput) {
    return this.zkmlService.antiCheatCheck(input);
  }

  /**
   * 获取 ZK-ML 统计信息
   */
  @Query(() => ZKMLStatsResponse)
  async zkmlStats() {
    return this.zkmlService.getStats();
  }
}