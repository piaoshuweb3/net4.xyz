import { Resolver, Query, Mutation, Args, ID, Context, Int } from '@nestjs/graphql';
import { UseGuards, BadRequestException } from '@nestjs/common';
import { NodeService } from './node.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RegisterNodeInput, ApproveNodeInput, UpdateNodeInput, ActivateAIAvatarInput } from './dto/node.input';
import { NodeResponse, PaginatedNodesResponse, NodeStatsResponse, NodeEarningsResponse, AIAvatarResponse } from './dto/node.response';
import { NodeType, NodeStatus, PunishmentType } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';

@Resolver()
export class NodeResolver {
  constructor(
    private nodeService: NodeService,
    private prisma: PrismaService,
  ) {}

  /**
   * 获取节点详情
   */
  @Query(() => NodeResponse)
  async node(@Args('id', { type: () => ID }) id: string) {
    return this.nodeService.getById(id);
  }

  /**
   * 获取节点列表
   */
  @Query(() => PaginatedNodesResponse)
  async nodes(
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('limit', { defaultValue: 20 }) limit: number,
    @Args('nodeType', { nullable: true, type: () => String }) nodeType?: NodeType,
    @Args('status', { nullable: true, type: () => String }) status?: NodeStatus,
    @Args('region', { nullable: true }) region?: string,
  ) {
    return this.nodeService.getList(nodeType, status, page, limit, region);
  }

  /**
   * 获取待审批节点列�?
   */
  @Query(() => PaginatedNodesResponse)
  @UseGuards(AuthGuard)
  async pendingNodes(
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('limit', { defaultValue: 20 }) limit: number,
  ) {
    return this.nodeService.getPendingNodes(page, limit);
  }

  /**
   * 获取活跃节点列表
   */
  @Query(() => [NodeResponse])
  async activeNodes() {
    return this.nodeService.getActiveNodes();
  }

  /**
   * 获取节点统计信息
   */
  @Query(() => NodeStatsResponse)
  async nodeStats() {
    return this.nodeService.getStats();
  }

  /**
   * 获取抵押金额
   */
  @Query(() => Int)
  stakeAmount(@Args('nodeType', { type: () => String }) nodeType: NodeType) {
    return this.nodeService.getStakeAmount(nodeType);
  }

  /**
   * 获取节点数量限制
   */
  @Query(() => Int)
  nodeLimit(@Args('nodeType', { type: () => String }) nodeType: NodeType) {
    return this.nodeService.getNodeLimit(nodeType);
  }

  /**
   * 注册节点
   */
  @Mutation(() => NodeResponse)
  @UseGuards(AuthGuard)
  async registerNode(
    @Context() context: any,
    @Args('input') input: RegisterNodeInput,
  ) {
    return this.nodeService.register(context.req.user.id, input);
  }

  /**
   * 审批节点（管理员�?
   */
  @Mutation(() => NodeResponse)
  @UseGuards(AuthGuard)
  async approveNode(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: ApproveNodeInput,
  ) {
    return this.nodeService.approveNode(id, input);
  }

  /**
   * 更新节点信息
   */
  @Mutation(() => NodeResponse)
  @UseGuards(AuthGuard)
  async updateNode(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateNodeInput,
  ) {
    return this.nodeService.updateNode(id, context.req.user.id, input);
  }

  /**
   * 触发惩罚机制
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async punishNode(
    @Args('nodeId', { type: () => ID }) nodeId: string,
    @Args('type', { type: () => String }) type: PunishmentType,
    @Args('amount') amount: number,
    @Args('reason') reason: string,
  ) {
    return this.nodeService.punish(nodeId, type, amount, reason);
  }

  /**
   * 解除惩罚
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async resolvePunishment(@Args('punishmentId', { type: () => ID }) punishmentId: string) {
    return this.nodeService.resolvePunishment(punishmentId);
  }

  /**
   * 创建申诉
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async createAppeal(
    @Args('punishmentId', { type: () => ID }) punishmentId: string,
    @Args('nodeId', { type: () => ID }) nodeId: string,
    @Args('reason') reason: string,
    @Args('evidence', { nullable: true }) evidence?: string,
  ) {
    return this.nodeService.createAppeal(punishmentId, nodeId, reason, evidence);
  }

  /**
   * 获取节点的申诉列�?
   */
  @Query(() => [Object])
  @UseGuards(AuthGuard)
  async nodeAppeals(@Args('nodeId', { type: () => ID }) nodeId: string) {
    return this.nodeService.getAppealsByNode(nodeId);
  }

  /**
   * 获取申诉详情
   */
  @Query(() => String)
  @UseGuards(AuthGuard)
  async appeal(@Args('appealId', { type: () => ID }) appealId: string) {
    return this.nodeService.getAppeal(appealId);
  }

  /**
   * 审核申诉
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async reviewAppeal(
    @Context() context: any,
    @Args('appealId', { type: () => ID }) appealId: string,
    @Args('approved') approved: boolean,
    @Args('reviewComment') reviewComment: string,
  ) {
    const userId = context.req?.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.nodeService.reviewAppeal(appealId, userId, approved, reviewComment);
  }

  /**
   * 获取待审核的申诉列表
   */
  @Query(() => [Object])
  @UseGuards(AuthGuard)
  async pendingAppeals() {
    return this.nodeService.getPendingAppeals();
  }

  /**
   * 节点心跳
   */
  @Mutation(() => NodeResponse)
  @UseGuards(AuthGuard)
  async nodeHeartbeat(
    @Context() context: any,
    @Args('nodeId', { type: () => ID }) nodeId: string,
  ) {
    return this.nodeService.heartbeat(nodeId);
  }

  /**
   * 检查节点是否在�?
   */
  @Query(() => Boolean)
  async checkNodeOnline(@Args('nodeId', { type: () => ID }) nodeId: string) {
    return this.nodeService.checkNodeOnline(nodeId);
  }

  /**
   * 获取节点收益信息
   */
  @Query(() => NodeEarningsResponse)
  async nodeEarnings(@Args('nodeId', { type: () => ID }) nodeId: string) {
    return this.nodeService.getNodeEarnings(nodeId);
  }

  /**
   * 获取当前用户节点
   */
  @Query(() => NodeResponse, { nullable: true })
  @UseGuards(AuthGuard)
  async myNode(@Context() context: any) {
    const user = await this.prisma?.user?.findUnique({
      where: { id: context.req.user.id },
      select: { nodeId: true },
    });
    
    if (!user?.nodeId) return null;
    
    return this.nodeService.getById(user.nodeId);
  }

  /**
   * 激�?AI 分身
   */
  @Mutation(() => AIAvatarResponse)
  @UseGuards(AuthGuard)
  async activateaIAvatar(
    @Context() context: any,
    @Args('nodeId', { type: () => ID }) nodeId: string,
    @Args('input') input: ActivateAIAvatarInput,
  ) {
    return this.nodeService.activateaIAvatar(
      nodeId,
      context.req.user.id,
      input.avatarType,
      input.nickname,
      input.sparkNftId,
    );
  }

  /**
   * 获取节点�?AI 分身
   */
  @Query(() => AIAvatarResponse, { nullable: true })
  async nodeAIAvatar(@Args('nodeId', { type: () => ID }) nodeId: string) {
    return this.nodeService.getNodeaIAvatar(nodeId);
  }

  /**
   * 更新 AI 分身
   */
  @Mutation(() => AIAvatarResponse)
  @UseGuards(AuthGuard)
  async updateaIAvatar(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
    @Args('nickname', { nullable: true }) nickname?: string,
    @Args('avatarType', { nullable: true }) avatarType?: string,
  ) {
    return this.nodeService.updateaIAvatar(id, context.req.user.id, nickname, avatarType);
  }
}

