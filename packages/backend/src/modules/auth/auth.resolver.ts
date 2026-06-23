import { Resolver, Mutation, Args, Query, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { RegisterInput, LoginInput, WalletLoginInput, OAuthLoginInput } from './dto/auth.input';
import { AuthResponse, AuthUserResponse } from './dto/auth.response';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  /**
   * 邮箱注册
   */
  @Mutation(() => AuthResponse)
  async register(@Args('input') input: RegisterInput) {
    const result = await this.authService.registerWithEmail(input.email, input.password);
    return result;
  }

  /**
   * 邮箱登录
   */
  @Mutation(() => AuthResponse)
  async login(@Args('input') input: LoginInput) {
    const result = await this.authService.loginWithEmail(input.email, input.password);
    return result;
  }

  /**
   * 钱包登录
   */
  @Mutation(() => AuthResponse)
  async walletLogin(@Args('input') input: WalletLoginInput) {
    const result = await this.authService.loginWithWallet(input.address);
    return result;
  }

  /**
   * OAuth 登录（Twitter/Google）
   */
  @Mutation(() => AuthResponse)
  async oauthLogin(@Args('input') input: OAuthLoginInput) {
    if (input.provider === 'twitter') {
      return this.authService.loginWithTwitter(input.providerId, {
        username: input.username,
        displayName: input.displayName,
      });
    } else if (input.provider === 'google') {
      return this.authService.loginWithGoogle(input.providerId, {
        email: input.email,
        name: input.name,
      });
    }
    throw new Error('Unsupported provider');
  }

  /**
   * 验证 token
   */
  @Query(() => AuthUserResponse)
  @UseGuards(AuthGuard)
  async me(@Context() context: any) {
    return context.req.user;
  }

  /**
   * 验证邮箱
   */
  @Mutation(() => Boolean)
  async verifyEmail(@Args('token') token: string) {
    const result = await this.authService.verifyEmail(token);
    return result.success;
  }

  /**
   * 请求密码重置
   */
  @Mutation(() => Boolean)
  async requestPasswordReset(@Args('email') email: string) {
    const result = await this.authService.requestPasswordReset(email);
    return result.success;
  }

  /**
   * 重置密码
   */
  @Mutation(() => Boolean)
  async resetPassword(
    @Args('token') token: string,
    @Args('newPassword') newPassword: string,
  ) {
    const result = await this.authService.resetPassword(token, newPassword);
    return result.success;
  }
}