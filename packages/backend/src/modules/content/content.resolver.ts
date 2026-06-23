import { Resolver, Query, Mutation, Args, ID, Context, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ContentService } from './content.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CreateContentInput, UpdateContentInput, PublishContentInput, ApproveContentInput } from './dto/content.input';
import { ContentResponse, PaginatedContentsResponse, TagResponse, ContentStatsResponse } from './dto/content.response';
// ContentType 和 ContentStatus 来自 Prisma schema，但客户端未生成时使用字符串
type ContentType = 'ARTICLE' | 'VIDEO' | 'IMAGE' | 'AUDIO' | 'CODE' | 'TUTORIAL';
type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'PENDING_REVIEW' | 'REJECTED';

@Resolver()
export class ContentResolver {
  constructor(private contentService: ContentService) {}

  /**
   * 获取内容详情
   */
  @Query(() => ContentResponse)
  async content(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: any,
  ) {
    const userId = context.req.user?.id;
    return this.contentService.getById(id, userId);
  }

  /**
   * 获取内容列表
   */
  @Query(() => PaginatedContentsResponse)
  async contents(
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('limit', { defaultValue: 20 }) limit: number,
    @Args('status', { defaultValue: 'PUBLISHED' }) status: ContentStatus,
    @Args('type', { nullable: true }) type?: string,
    @Args('tag', { nullable: true }) tag?: string,
  ) {
    return this.contentService.getList(type as any, status as any, page, limit, tag);
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
    return this.contentService.getPendingContents(page, limit);
  }

  /**
   * 搜索内容
   */
  @Query(() => PaginatedContentsResponse)
  async searchContents(
    @Args('query') query: string,
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('limit', { defaultValue: 20 }) limit: number,
  ) {
    return this.contentService.search(query, page, limit);
  }

  /**
   * 获取热门内容
   */
  @Query(() => [ContentResponse])
  async hotContents(@Args('limit', { defaultValue: 10 }) limit: number) {
    return this.contentService.getHotContents(limit);
  }

  /**
   * 获取内容标签
   */
  @Query(() => [TagResponse])
  async contentTags() {
    return this.contentService.getTags();
  }

  /**
   * 创建内容
   */
  @Mutation(() => ContentResponse)
  @UseGuards(AuthGuard)
  async createContent(
    @Context() context: any,
    @Args('input') input: CreateContentInput,
  ) {
    return this.contentService.create(context.req.user.id, input);
  }

  /**
   * 更新内容
   */
  @Mutation(() => ContentResponse)
  @UseGuards(AuthGuard)
  async updateContent(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateContentInput,
  ) {
    return this.contentService.update(id, context.req.user.id, input);
  }

  /**
   * 提交审核
   */
  @Mutation(() => ContentResponse)
  @UseGuards(AuthGuard)
  async submitContent(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.contentService.submitForReview(id, context.req.user.id);
  }

  /**
   * 审核内容（管理员）
   */
  @Mutation(() => ContentResponse)
  @UseGuards(AuthGuard)
  async approveContent(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: ApproveContentInput,
  ) {
    return this.contentService.approveContent(id, input);
  }

  /**
   * 发布到 IPFS
   */
  @Mutation(() => ContentResponse)
  @UseGuards(AuthGuard)
  async publishContent(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.contentService.publishToIpfs(id, context.req.user.id);
  }

  /**
   * 添加评论
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async addComment(
    @Context() context: any,
    @Args('contentId', { type: () => ID }) contentId: string,
    @Args('text') text: string,
    @Args('parentId', { nullable: true }) parentId?: string,
  ) {
    return this.contentService.addComment(contentId, context.req.user.id, text, parentId);
  }

  /**
   * 点赞内容
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async likeContent(
    @Context() context: any,
    @Args('contentId', { type: () => ID }) contentId: string,
  ) {
    return this.contentService.likeContent(contentId, context.req.user.id);
  }

  /**
   * 删除内容
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async deleteContent(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.contentService.delete(id, context.req.user.id, context.req.user.isAdmin);
  }

  /**
   * 获取用户内容列表
   */
  @Query(() => PaginatedContentsResponse)
  @UseGuards(AuthGuard)
  async myContents(
    @Context() context: any,
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('limit', { defaultValue: 20 }) limit: number,
  ) {
    return this.contentService.getUserContents(context.req.user.id, page, limit);
  }
}