import { Resolver, Query, Args, ID, Int, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ContentResponse, ContentStatsResponse } from './dto/content.response';
import { ContentType } from '@prisma/client';

@Resolver('Recommendation')
export class RecommendationResolver {
  constructor(private recommendationService: RecommendationService) {}

  /**
   * 获取个性化推荐
   */
  @Query(() => [ContentResponse])
  @UseGuards(AuthGuard)
  async personalizedRecommendations(
    @Context() context: any,
    @Args('limit', { defaultValue: 10 }) limit: number,
  ) {
    return this.recommendationService.getPersonalizedRecommendations(
      context.req.user.id,
      limit,
    );
  }

  /**
   * 获取相关内容推荐
   */
  @Query(() => [ContentResponse])
  async relatedContent(
    @Args('contentId', { type: () => ID }) contentId: string,
    @Args('limit', { defaultValue: 5 }) limit: number,
  ) {
    return this.recommendationService.getRelatedContent(contentId, limit);
  }

  /**
   * 获取相似作者的内容
   */
  @Query(() => [ContentResponse])
  async similarAuthorContent(
    @Args('authorId', { type: () => ID }) authorId: string,
    @Args('limit', { defaultValue: 5 }) limit: number,
  ) {
    return this.recommendationService.getSimilarAuthorContent(authorId, limit);
  }

  /**
   * 获取最新内容
   */
  @Query(() => [ContentResponse])
  async latestContent(
    @Args('limit', { defaultValue: 10 }) limit: number,
    @Args('type', { nullable: true, type: () => String }) type?: ContentType,
  ) {
    return this.recommendationService.getLatestContent(limit, type);
  }

  /**
   * 获取编辑精选
   */
  @Query(() => [ContentResponse])
  async featuredContent(@Args('limit', { defaultValue: 5 }) limit: number) {
    return this.recommendationService.getFeaturedContent(limit);
  }

  /**
   * 获取内容统计
   */
  @Query(() => ContentStatsResponse)
  async contentStats() {
    return this.recommendationService.getContentStats();
  }
}