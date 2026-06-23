import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-twitter';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TwitterStrategy extends PassportStrategy(Strategy, 'twitter') {
  private readonly logger = new Logger(TwitterStrategy.name);

  constructor(private configService: ConfigService) {
    const consumerKey = configService.get<string>('TWITTER_CLIENT_ID');
    const consumerSecret = configService.get<string>('TWITTER_CLIENT_SECRET');

    if (!consumerKey || !consumerSecret) {
      // net4.xyz: 缺少 Twitter OAuth 配置时使用占位值（服务降级）
      Logger.warn('Twitter OAuth 未配置，使用降级模式');
    }

    super({
      consumerKey: consumerKey || 'placeholder_key',
      consumerSecret: consumerSecret || 'placeholder_secret',
      callbackURL: configService.get('TWITTER_CALLBACK_URL', 'http://localhost:3000/auth/twitter/callback'),
    });
  }

  async validate(
    token: string,
    tokenSecret: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const user = {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      photos: profile.photos,
    };
    done(null, user);
  }
}