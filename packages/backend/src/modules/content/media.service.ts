import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { S3Service } from '../common/services/s3.service';
import { IpfsService } from '../common/services/ipfs.service';
import { MediaType } from '@prisma/client';
import { UploadMediaInput } from './dto/media.input';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private ipfsService: IpfsService,
  ) {}

  /**
   * 获取预签名的上传 URL
   */
  async getUploadUrl(userId: string, input: UploadMediaInput) {
    // 验证文件大小
    const maxSize = this.getMaxFileSize(input.type);
    if (input.size > maxSize) {
      throw new BadRequestException(`File size exceeds maximum allowed for ${input.type}`);
    }

    // 验证文件类型
    if (!this.isValidMimeType(input.type, input.mimeType)) {
      throw new BadRequestException(`Invalid file type for ${input.type}`);
    }

    // 生成 S3 key
    const folder = this.getFolderByType(input.type);
    const key = this.s3Service.generateKey(input.filename, folder);

    // 获取预签名 URL
    const uploadUrl = await this.s3Service.getSignedUploadUrl(key, input.mimeType);

    // 创建媒体记录（待处理状态）
    const media = await this.prisma.media.create({
      data: {
        type: input.type,
        url: `https://${process.env.AWS_S3_BUCKET || 'net4xyz-media'}/${key}`,
        filename: input.filename,
        mimeType: input.mimeType,
        size: input.size,
        width: input.width,
        height: input.height,
        duration: input.duration,
        uploadedBy: userId,
        contentId: input.contentId,
      },
    });

    return {
      uploadUrl,
      mediaId: media.id,
      key,
    };
  }

  /**
   * 确认上传完成（处理图片/视频）
   */
  async confirmUpload(mediaId: string, userId: string) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (media.uploadedBy !== userId) {
      throw new BadRequestException('Not authorized');
    }

    // 如果是图片，尝试上传到 IPFS
    let ipfsHash: string | null = null;
    if (media.type === MediaType.IMAGE) {
      try {
        // 获取文件内容并上传到 IPFS
        // 注意：实际实现需要从 S3 下载文件
        // 这里简化处理
        ipfsHash = await this.ipfsService.uploadJson({
          filename: media.filename,
          mimeType: media.mimeType,
          size: media.size,
          uploadedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to upload to IPFS:', error);
      }
    }

    return this.prisma.media.update({
      where: { id: mediaId },
      data: { ipfsHash },
    });
  }

  /**
   * 关联媒体到内容
   */
  async attachToContent(mediaId: string, contentId: string, userId: string) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (media.uploadedBy !== userId) {
      throw new BadRequestException('Not authorized');
    }

    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    if (content.authorId !== userId) {
      throw new BadRequestException('Not authorized to modify this content');
    }

    return this.prisma.media.update({
      where: { id: mediaId },
      data: { contentId },
    });
  }

  /**
   * 删除媒体
   */
  async delete(mediaId: string, userId: string, isAdmin: boolean) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (media.uploadedBy !== userId && !isAdmin) {
      throw new BadRequestException('Not authorized to delete this media');
    }

    // 从 S3 删除
    try {
      const key = media.url.split('.s3.amazonaws.com/')[1];
      if (key) {
        await this.s3Service.deleteFile(key);
      }
    } catch (error) {
      console.error('Failed to delete from S3:', error);
    }

    // 从数据库删除
    await this.prisma.media.delete({
      where: { id: mediaId },
    });

    return { success: true };
  }

  /**
   * 获取内容的媒体列表
   */
  async getByContent(contentId: string) {
    return this.prisma.media.findMany({
      where: { contentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * 获取媒体详情
   */
  async getById(mediaId: string) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    return media;
  }

  /**
   * 获取预签名的下载 URL
   */
  async getDownloadUrl(mediaId: string) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    const key = media.url.split('.s3.amazonaws.com/')[1];
    if (!key) {
      return media.url;
    }

    return this.s3Service.getSignedDownloadUrl(key);
  }

  private getMaxFileSize(type: MediaType): number {
    const limits = {
      [MediaType.IMAGE]: 10 * 1024 * 1024, // 10MB
      [MediaType.VIDEO]: 500 * 1024 * 1024, // 500MB
      [MediaType.AUDIO]: 50 * 1024 * 1024, // 50MB
      [MediaType.DOCUMENT]: 20 * 1024 * 1024, // 20MB
    };
    return limits[type] || 10 * 1024 * 1024;
  }

  private isValidMimeType(type: MediaType, mimeType: string): boolean {
    const validTypes: Record<MediaType, string[]> = {
      [MediaType.IMAGE]: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      [MediaType.VIDEO]: ['video/mp4', 'video/webm', 'video/quicktime'],
      [MediaType.AUDIO]: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'],
      [MediaType.DOCUMENT]: ['application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    };
    return validTypes[type]?.includes(mimeType) || false;
  }

  private getFolderByType(type: MediaType): string {
    const folders = {
      [MediaType.IMAGE]: 'images',
      [MediaType.VIDEO]: 'videos',
      [MediaType.AUDIO]: 'audio',
      [MediaType.DOCUMENT]: 'documents',
    };
    return folders[type] || 'uploads';
  }
}