import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PenaltyService } from './penalty.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PunishmentType } from '@prisma/client';

@Resolver()
export class PenaltyResolver {
  constructor(private penaltyService: PenaltyService) {}

  /**
   * 手动触发离线检测
   */
  @Query(() => String)
  @UseGuards(AuthGuard)
  async detectOfflineNodes() {
    return this.penaltyService.detectOfflineNodes();
  }

  /**
   * 触发作弊惩罚
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async punishForCheating(
    @Args('nodeId', { type: () => ID }) nodeId: string,
    @Args('reason') reason: string,
  ) {
    return this.penaltyService.punishForCheating(nodeId, reason);
  }

  /**
   * 触发内容违规惩罚
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async punishForContentViolation(
    @Args('nodeId', { type: () => ID }) nodeId: string,
    @Args('reason') reason: string,
  ) {
    return this.penaltyService.punishForContentViolation(nodeId, reason);
  }

  /**
   * 解除惩罚
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async resolvePunishment(@Args('punishmentId', { type: () => ID }) punishmentId: string) {
    return this.penaltyService.resolvePunishment(punishmentId);
  }

  /**
   * 获取惩罚统计
   */
  @Query(() => String)
  async penaltyStats() {
    return this.penaltyService.getPenaltyStats();
  }

  /**
   * 获取节点的惩罚历史
   */
  @Query(() => [Object])
  async nodePunishments(@Args('nodeId', { type: () => ID }) nodeId: string) {
    return this.penaltyService.getNodePunishments(nodeId);
  }
}