import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentResolver } from './content.resolver';
import { MediaService } from './media.service';
import { MediaResolver } from './media.resolver';
import { RecommendationService } from './recommendation.service';
import { RecommendationResolver } from './recommendation.resolver';
import { ModerationService } from './moderation.service';
import { ModerationResolver } from './moderation.resolver';

@Module({
  providers: [
    ContentService,
    ContentResolver,
    MediaService,
    MediaResolver,
    RecommendationService,
    RecommendationResolver,
    ModerationService,
    ModerationResolver,
  ],
  exports: [
    ContentService,
    MediaService,
    RecommendationService,
    ModerationService,
  ],
})
export class ContentModule {}