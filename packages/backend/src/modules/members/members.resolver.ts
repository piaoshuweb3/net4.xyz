import { Resolver, Query, Mutation, Args, ID, Context, Int, Float } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { MembersService } from './members.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { CreateMembershipInput, VerifyMembershipInput } from './dto/members.input';
import { MemberPriceResponse, MembershipInfoResponse, PaginatedOrdersResponse, MemberStatisticsResponse, MemberTrendResponse, MemberRevenueDistributionResponse } from './dto/members.response';
import { MemberLevel, PaymentMethod } from '@prisma/client';

@Resolver()
export class MembersResolver {
  constructor(private membersService: MembersService) {}

  /**
   * 获取所有会员等级价格
   */
  @Query(() => [MemberPriceResponse])
  async memberPrices() {
    return this.membersService.getAllMemberPrices();
  }

  /**
   * 获取会员权益
   */
  @Query(() => [String])
  async memberBenefits(@Args('level', { type: () => String }) level: MemberLevel) {
    return this.membersService.getMemberBenefits(level);
  }

  /**
   * 创建会员订单
   */
  @Mutation(() => MemberPriceResponse)
  @UseGuards(AuthGuard)
  async createMembershipOrder(
    @Context() context: any,
    @Args('input') input: CreateMembershipInput,
  ) {
    return this.membersService.createMembershipOrder(
      context.req.user.id,
      input.level,
      input.paymentMethod as PaymentMethod,
    );
  }

  /**
   * 验证会员权益
   */
  @Query(() => Boolean)
  @UseGuards(AuthGuard)
  async verifyMembership(
    @Context() context: any,
    @Args('input') input: VerifyMembershipInput,
  ) {
    return this.membersService.verifyMembership(context.req.user.id, input.requiredLevel);
  }

  /**
   * 获取当前用户会员信息
   */
  @Query(() => MembershipInfoResponse)
  @UseGuards(AuthGuard)
  async myMembership(@Context() context: any) {
    return this.membersService.getMembershipInfo(context.req.user.id);
  }

  /**
   * 获取会员订单列表
   */
  @Query(() => PaginatedOrdersResponse)
  @UseGuards(AuthGuard)
  async myMembershipOrders(
    @Context() context: any,
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('limit', { defaultValue: 20 }) limit: number,
  ) {
    return this.membersService.getMembershipOrders(context.req.user.id, page, limit);
  }

  /**
   * 检查是否可以升级
   */
  @Query(() => String)
  @UseGuards(AuthGuard)
  async canUpgrade(
    @Context() context: any,
    @Args('targetLevel', { type: () => String }) targetLevel: MemberLevel,
  ) {
    return this.membersService.canUpgrade(context.req.user.id, targetLevel);
  }

  /**
   * 获取会员统计数据（管理员）
   */
  @Query(() => MemberStatisticsResponse)
  @UseGuards(AuthGuard, AdminGuard)
  async memberStatistics() {
    return this.membersService.getMemberStatistics();
  }

  /**
   * 获取会员趋势数据（管理员）
   */
  @Query(() => [MemberTrendResponse])
  @UseGuards(AuthGuard, AdminGuard)
  async memberTrend(@Args('days', { defaultValue: 30 }) days: number) {
    return this.membersService.getMemberTrend(days);
  }

  /**
   * 获取会员收入分布（管理员）
   */
  @Query(() => MemberRevenueDistributionResponse)
  @UseGuards(AuthGuard, AdminGuard)
  async memberRevenueDistribution() {
    return this.membersService.getMemberRevenueDistribution();
  }
}