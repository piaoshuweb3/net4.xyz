import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UploadMediaInput, DeleteMediaInput } from './dto/media.input';
import { MediaResponse } from './dto/content.response';

@Resolver('Media')
export class MediaResolver {
  constructor(private mediaService: MediaService) {}

  /**
   * 获取预签名的上传 URL
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async getUploadUrl(
    @Context() context: any,
    @Args('input') input: UploadMediaInput,
  ) {
    return this.mediaService.getUploadUrl(context.req.user.id, input);
  }

  /**
   * 确认上传完成
   */
  @Mutation(() => MediaResponse)
  @UseGuards(AuthGuard)
  async confirmMediaUpload(
    @Context() context: any,
    @Args('mediaId', { type: () => ID }) mediaId: string,
  ) {
    return this.mediaService.confirmUpload(mediaId, context.req.user.id);
  }

  /**
   * 关联媒体到内容
   */
  @Mutation(() => MediaResponse)
  @UseGuards(AuthGuard)
  async attachMedia(
    @Context() context: any,
    @Args('mediaId', { type: () => ID }) mediaId: string,
    @Args('contentId', { type: () => ID }) contentId: string,
  ) {
    return this.mediaService.attachToContent(mediaId, contentId, context.req.user.id);
  }

  /**
   * 删除媒体
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async deleteMedia(
    @Context() context: any,
    @Args('mediaId', { type: () => ID }) mediaId: string,
  ) {
    return this.mediaService.delete(mediaId, context.req.user.id, context.req.user.isAdmin);
  }

  /**
   * 获取内容的媒体列表
   */
  @Query(() => [MediaResponse])
  async contentMedia(
    @Args('contentId', { type: () => ID }) contentId: string,
  ) {
    return this.mediaService.getByContent(contentId);
  }

  /**
   * 获取媒体详情
   */
  @Query(() => MediaResponse)
  async media(@Args('id', { type: () => ID }) id: string) {
    return this.mediaService.getById(id);
  }

  /**
   * 获取预签名的下载 URL
   */
  @Query(() => String)
  async mediaDownloadUrl(@Args('id', { type: () => ID }) id: string) {
    return this.mediaService.getDownloadUrl(id);
  }
}