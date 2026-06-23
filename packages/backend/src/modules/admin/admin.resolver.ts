import { Resolver, Query, Mutation, Args, ID, Context, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { MemberLevel, ContentStatus } from '@prisma/client';

@Resolver()
export class AdminResolver {
  constructor(private adminService: AdminService) {}

  // ==================== 用户管理 ====================

  /**
   * 获取所有用户（分页）
   */
  @Query(() => String)
  @UseGuards(AuthGuard)
  async adminUsers(
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('limit', { defaultValue: 20 }) limit: number,
    @Args('memberLevel', { nullable: true, type: () => String }) memberLevel?: MemberLevel,
    @Args('isVerified', { nullable: true }) isVerified?: boolean,
  ) {
    return this.adminService.getUsers(page, limit, memberLevel, isVerified);
  }

  /**
   * 获取用户详情
   */
  @Query(() => String)
  @UseGuards(AuthGuard)
  async adminUser(@Args('id', { type: () => ID }) id: string) {
    return this.adminService.getUserById(id);
  }

  /**
   * 更新用户（管理员）
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async adminUpdateUser(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
    @Args('email', { nullable: true }) email?: string,
    @Args('memberLevel', { nullable: true, type: () => String }) memberLevel?: MemberLevel,
    @Args('memberExpiry', { nullable: true }) memberExpiry?: Date,
    @Args('isVerified', { nullable: true }) isVerified?: boolean,
    @Args('isAdmin', { nullable: true }) isAdmin?: boolean,
  ) {
    return this.adminService.updateUser(context.req.user.id, id, {
      email,
      memberLevel,
      memberExpiry,
      isVerified,
      isAdmin,
    });
  }

  /**
   * 删除用户
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async adminDeleteUser(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.adminService.deleteUser(context.req.user.id, id);
  }

  // ==================== 内容审核 ====================

  /**
   * 获取待审核内容
   */
  @Query(() => String)
  @UseGuards(AuthGuard)
  async pendingContents(
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('limit', { defaultValue: 20 }) limit: number,
  ) {
    return this.adminService.getPendingContents(page, limit);
  }

  /**
   * 审核内容
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async reviewContent(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
    @Args('approved') approved: boolean,
    @Args('reason', { nullable: true }) reason?: string,
  ) {
    return this.adminService.reviewContent(context.req.user.id, id, approved, reason);
  }

  /**
   * 删除内容
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async adminDeleteContent(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.adminService.deleteContent(context.req.user.id, id);
  }

  // ==================== 财务对账 ====================

  /**
   * 财务对账
   */
  @Query(() => String)
  @UseGuards(AuthGuard)
  async reconcile(
    @Args('startDate') startDate: Date,
    @Args('endDate') endDate: Date,
  ) {
    return this.adminService.reconcile(startDate, endDate);
  }

  /**
   * 获取收入统计
   */
  @Query(() => String)
  @UseGuards(AuthGuard)
  async revenueStats(
    @Args('startDate') startDate: Date,
    @Args('endDate') endDate: Date,
  ) {
    return this.adminService.getRevenueStats(startDate, endDate);
  }

  // ==================== 系统配置 ====================

  /**
   * 获取系统配置
   */
  @Query(() => Object, { nullable: true })
  @UseGuards(AuthGuard)
  async systemConfig(@Args('key') key: string) {
    return this.adminService.getConfig(key);
  }

  /**
   * 设置系统配置
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async setSystemConfig(
    @Context() context: any,
    @Args('key') key: string,
    @Args('value', { type: () => Object }) value: object,
    @Args('description', { nullable: true }) description?: string,
    @Args('isPublic', { defaultValue: false }) isPublic?: boolean,
  ) {
    return this.adminService.setConfig(context.req.user.id, key, value, description, isPublic);
  }

  /**
   * 获取所有系统配置
   */
  @Query(() => [Object])
  @UseGuards(AuthGuard)
  async allSystemConfigs(
    @Args('includePrivate', { defaultValue: false }) includePrivate: boolean,
  ) {
    return this.adminService.getAllConfigs(includePrivate);
  }

  // ==================== 数据统计 ====================

  /**
   * 获取仪表盘统计
   */
  @Query(() => String)
  @UseGuards(AuthGuard)
  async dashboardStats() {
    return this.adminService.getDashboardStats();
  }

  /**
   * 获取用户增长统计
   */
  @Query(() => [Object])
  @UseGuards(AuthGuard)
  async userGrowthStats(@Args('days', { defaultValue: 30 }) days: number) {
    return this.adminService.getUserGrowthStats(days);
  }

  /**
   * 获取节点统计
   */
  @Query(() => String)
  @UseGuards(AuthGuard)
  async nodeStats() {
    return this.adminService.getNodeStats();
  }

  // ==================== 审计日志 ====================

  /**
   * 获取审计日志
   */
  @Query(() => String)
  @UseGuards(AuthGuard)
  async auditLogs(
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('limit', { defaultValue: 50 }) limit: number,
    @Args('userId', { nullable: true }) userId?: string,
    @Args('action', { nullable: true }) action?: string,
  ) {
    return this.adminService.getAuditLogs(userId, action, page, limit);
  }
}