import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmailService {
  private sendGridApiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor(private configService: ConfigService) {
    this.sendGridApiKey = this.configService.get('SENDGRID_API_KEY', '');
    this.fromEmail = this.configService.get('FROM_EMAIL', 'noreply@net4.xyz');
    this.fromName = this.configService.get('FROM_NAME', 'net4.xyz');
  }

  /**
   * 发送邮件
   */
  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.sendGridApiKey) {
      console.log(`[Email] Mock send to ${to}: ${subject}`);
      return true;
    }

    try {
      await axios.post('https://api.sendgrid.com/v3/mail/send', {
        personalizations: [{
          to: [{ email: to }],
        }],
        from: { email: this.fromEmail, name: this.fromName },
        subject,
        content: [{ type: 'text/html', value: html }],
      }, {
        headers: {
          Authorization: `Bearer ${this.sendGridApiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return true;
    } catch (error) {
      console.error('Email send failed:', error.message);
      return false;
    }
  }

  /**
   * 发送验证邮件
   */
  async sendVerificationEmail(email: string, token: string): Promise<boolean> {
    const verifyUrl = `${this.configService.get('FRONTEND_URL', 'https://net4.xyz')}/verify?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #B026FF;">net4.xyz 邮箱验证</h1>
        <p>您好，</p>
        <p>感谢您注册 net4.xyz。请点击以下链接验证您的邮箱：</p>
        <p><a href="${verifyUrl}" style="background: #B026FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">验证邮箱</a></p>
        <p>如果链接无法点击，请复制以下链接到浏览器：</p>
        <p style="word-break: break-all;">${verifyUrl}</p>
        <p style="color: #666; font-size: 12px;">此链接有效期为 24 小时</p>
      </div>
    `;
    return this.sendEmail(email, 'net4.xyz 邮箱验证', html);
  }

  /**
   * 发送会员到期提醒
   */
  async sendMembershipExpiryEmail(email: string, daysLeft: number, level: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #B026FF;">net4.xyz 会员到期提醒</h1>
        <p>您好，</p>
        <p>您的 <strong>${level}</strong> 会员将在 <strong>${daysLeft} 天</strong> 后到期。</p>
        <p>请及时续费以继续享受会员权益。</p>
        <p><a href="${this.configService.get('FRONTEND_URL', 'https://net4.xyz')}/membership" 
           style="background: #B026FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
           立即续费
        </a></p>
      </div>
    `;
    return this.sendEmail(email, 'net4.xyz 会员到期提醒', html);
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const resetUrl = `${this.configService.get('FRONTEND_URL', 'https://net4.xyz')}/reset-password?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #B026FF;">net4.xyz 密码重置</h1>
        <p>您好，</p>
        <p>您请求重置密码。请点击以下链接：</p>
        <p><a href="${resetUrl}" style="background: #B026FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">重置密码</a></p>
        <p>如果链接无法点击，请复制以下链接到浏览器：</p>
        <p style="word-break: break-all;">${resetUrl}</p>
        <p style="color: #666; font-size: 12px;">此链接有效期为 1 小时</p>
      </div>
    `;
    return this.sendEmail(email, 'net4.xyz 密码重置', html);
  }
}