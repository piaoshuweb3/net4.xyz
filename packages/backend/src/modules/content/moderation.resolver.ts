import { Resolver, Query, Mutation, Args, ID, Context, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ModerationService, ModerationStatus } from './moderation.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ContentResponse, PaginatedContentsResponse } from './dto/content.response';
import { ReportContentInput, ModerateContentInput } from './dto/moderation.input';

@Resolver('Moderation')
export class ModerationResolver {
  constructor(private moderationService: ModerationService) {}

  /**
   * 举报内容
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async reportContent(
    @Context() context: any,
    @Args('input') input: ReportContentInput,
  ) {
    return this.moderationService.reportContent(context.req.user.id, input);
  }

  /**
   * 审核内容（批准/拒绝）
   */
  @Mutation(() => ContentResponse)
  @UseGuards(AuthGuard)
  async moderateContent(
    @Context() context: any,
    @Args('input') input: ModerateContentInput,
  ) {
    return this.moderationService.moderateContent(context.req.user.id, {
      contentId: input.contentId,
      status: input.approved ? ModerationStatus.APPROVED : ModerationStatus.REJECTED,
      moderatorNote: input.moderatorNote,
    });
  }

  /**
   * 获取待审核内容列表
   */
  @Query(() => PaginatedContentsResponse)
  @UseGuards(AuthGuard)
  async pendingContents(
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('limit', { defaultValue: 20 }) limit: number,
  ) {
    return this.moderationService.getPendingContents(page, limit);
  }

  /**
   * 获取被举报的内容列表
   */
  @Query(() => PaginatedContentsResponse)
  @UseGuards(AuthGuard)
  async flaggedContents(
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('limit', { defaultValue: 20 }) limit: number,
  ) {
    return this.moderationService.getFlaggedContents(page, limit);
  }

  /**
   * 批量审核内容
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async batchModerate(
    @Context() context: any,
    @Args('contentIds', { type: () => [ID] }) contentIds: string[],
    @Args('approved') approved: boolean,
  ) {
    return this.moderationService.batchModerate(
      context.req.user.id,
      contentIds,
      approved,
    );
  }

  /**
   * 获取内容审核统计
   */
  @Query(() => String)
  @UseGuards(AuthGuard)
  async moderationStats() {
    return this.moderationService.getModerationStats();
  }

  /**
   * 自动内容审核
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async autoModerate(
    @Args('contentId', { type: () => ID }) contentId: string,
  ) {
    return this.moderationService.autoModerate(contentId);
  }

  /**
   * 归档内容
   */
  @Mutation(() => ContentResponse)
  @UseGuards(AuthGuard)
  async archiveContent(
    @Context() context: any,
    @Args('contentId', { type: () => ID }) contentId: string,
  ) {
    return this.moderationService.archiveContent(
      contentId,
      context.req.user.id,
      context.req.user.isAdmin,
    );
  }

  /**
   * 恢复内容
   */
  @Mutation(() => ContentResponse)
  @UseGuards(AuthGuard)
  async restoreContent(
    @Context() context: any,
    @Args('contentId', { type: () => ID }) contentId: string,
  ) {
    return this.moderationService.restoreContent(
      contentId,
      context.req.user.id,
      context.req.user.isAdmin,
    );
  }
}