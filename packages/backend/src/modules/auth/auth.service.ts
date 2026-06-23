import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/services/prisma.service';
import { EmailService } from '../common/services/email.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  /**
   * 邮箱注册
   */
  async registerWithEmail(email: string, password: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { address: email }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        address: `0x${uuidv4().replace(/-/g, '').substring(0, 40)}`, // 生成虚拟钱包地址
        isVerified: false,
      },
    });

    // 发送验证邮件
    await this.emailService.sendVerificationEmail(email, verificationToken);

    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  /**
   * 邮箱登录
   */
  async loginWithEmail(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  /**
   * 钱包地址登录/注册
   */
  async loginWithWallet(address: string) {
    let user = await this.prisma.user.findUnique({
      where: { address: address.toLowerCase() },
    });

    if (!user) {
      // 自动注册
      user = await this.prisma.user.create({
        data: {
          address: address.toLowerCase(),
          isVerified: true, // 钱包地址默认已验证
        },
      });
    }

    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  /**
   * Twitter OAuth 登录
   */
  async loginWithTwitter(twitterId: string, profile: { username?: string; displayName?: string }) {
    let user = await this.prisma.user.findUnique({
      where: { twitter: twitterId },
    });

    if (!user) {
      // 自动注册
      user = await this.prisma.user.create({
        data: {
          twitter: twitterId,
          address: `0x${uuidv4().replace(/-/g, '').substring(0, 40)}`,
          isVerified: true,
        },
      });
    }

    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  /**
   * Google OAuth 登录
   */
  async loginWithGoogle(googleId: string, profile: { email?: string; name?: string }) {
    let user = await this.prisma.user.findUnique({
      where: { google: googleId },
    });

    if (!user) {
      // 如果有邮箱，检查是否已存在
      if (profile.email) {
        const existingWithEmail = await this.prisma.user.findUnique({
          where: { email: profile.email },
        });

        if (existingWithEmail) {
          // 关联 Google 账户
          user = await this.prisma.user.update({
            where: { id: existingWithEmail.id },
            data: { google: googleId },
          });
        }
      }

      // 仍然没有用户，创建新的
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            google: googleId,
            email: profile.email,
            address: `0x${uuidv4().replace(/-/g, '').substring(0, 40)}`,
            isVerified: true,
          },
        });
      }
    }

    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  /**
   * 验证 JWT token
   */
  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.sanitizeUser(user);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(token: string) {
    // 在实际实现中，应该从 token 中解析用户 ID
    // 这里简化处理
    return { success: true };
  }

  /**
   * 请求密码重置
   */
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 为了安全，不暴露用户不存在
      return { success: true };
    }

    const resetToken = uuidv4();
    await this.emailService.sendPasswordResetEmail(email, resetToken);

    return { success: true };
  }

  /**
   * 重置密码
   */
  async resetPassword(token: string, newPassword: string) {
    // 在实际实现中，应该从 token 中解析用户 ID
    // 这里简化处理
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // await this.prisma.user.update(...)
    return { success: true };
  }

  /**
   * 生成 JWT token
   */
  private generateToken(user: any): string {
    const payload = {
      sub: user.id,
      email: user.email,
      address: user.address,
      isAdmin: user.isAdmin,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * 清理用户敏感信息
   */
  private sanitizeUser(user: any) {
    const { password, ...result } = user;
    return result;
  }
}