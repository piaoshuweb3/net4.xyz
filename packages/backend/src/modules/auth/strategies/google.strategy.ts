import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!clientID || !clientSecret) {
      Logger.warn('Google OAuth 未配置，使用降级模式');
    }

    super({
      clientID: clientID || 'placeholder_google_client_id',
      clientSecret: clientSecret || 'placeholder_google_client_secret',
      callbackURL: configService.get('GOOGLE_CALLBACK_URL', 'http://localhost:3000/auth/google/callback'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const user = {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.name?.givenName + ' ' + profile.name?.familyName,
      photos: profile.photos,
    };
    done(null, user);
  }
}