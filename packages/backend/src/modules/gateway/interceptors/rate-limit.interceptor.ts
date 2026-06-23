import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Rate Limit Entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequestTime: number;
}

/**
 * Rate Limit Interceptor
 * Implements rate limiting per IP and per user
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly ipCache = new Map<string, RateLimitEntry>();
  private readonly userCache = new Map<string, RateLimitEntry>();

  // Default limits
  private readonly defaultLimits = {
    ttl: 60000, // 1 minute
    limit: 100, // 100 requests per minute
  };

  // Endpoint-specific limits
  private readonly endpointLimits: Record<string, { ttl: number; limit: number }> = {
    '/auth/login': { ttl: 60000, limit: 5 },      // 5 login attempts per minute
    '/auth/register': { ttl: 60000, limit: 3 },   // 3 registration attempts per minute
    '/auth/password-reset': { ttl: 3600000, limit: 3 }, // 3 password resets per hour
    '/graphql': { ttl: 60000, limit: 100 },       // 100 GraphQL requests per minute
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const ip = this.getClientIp(request);
    const userId = (request as any).user?.id;
    const path = request.path;

    // Get rate limit config for this endpoint
    const limitConfig = this.getLimitConfig(path);

    // Check IP-based rate limit
    const ipResult = this.checkRateLimit(ip, limitConfig, this.ipCache);
    if (!ipResult.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests from your IP',
          retryAfter: ipResult.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check user-based rate limit (if authenticated)
    if (userId) {
      const userResult = this.checkRateLimit(userId, limitConfig, this.userCache);
      if (!userResult.allowed) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests',
            retryAfter: userResult.retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Add rate limit headers
    response.setHeader('X-RateLimit-Limit', limitConfig.limit);
    response.setHeader('X-RateLimit-Remaining', ipResult.remaining);
    response.setHeader('X-RateLimit-Reset', ipResult.resetTime);

    return next.handle().pipe(
      tap(() => {
        // Update rate limit info on success
        this.incrementRateLimit(ip, this.ipCache);
        if (userId) {
          this.incrementRateLimit(userId, this.userCache);
        }
      }),
    );
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Get rate limit config for endpoint
   */
  private getLimitConfig(path: string): { ttl: number; limit: number } {
    // Check for exact match first
    if (this.endpointLimits[path]) {
      return this.endpointLimits[path];
    }

    // Check for prefix match
    for (const [pattern, config] of Object.entries(this.endpointLimits)) {
      if (path.startsWith(pattern)) {
        return config;
      }
    }

    return this.defaultLimits;
  }

  /**
   * Check rate limit
   */
  private checkRateLimit(
    key: string,
    config: { ttl: number; limit: number },
    cache: Map<string, RateLimitEntry>,
  ): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter: number;
  } {
    const now = Date.now();
    const entry = cache.get(key);

    if (!entry || now > entry.resetTime) {
      // New window
      const resetTime = now + config.ttl;
      cache.set(key, {
        count: 1,
        resetTime,
        firstRequestTime: now,
      });

      return {
        allowed: true,
        remaining: config.limit - 1,
        resetTime,
        retryAfter: config.ttl,
      };
    }

    if (entry.count >= config.limit) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      };
    }

    // Within limit
    return {
      allowed: true,
      remaining: config.limit - entry.count,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  /**
   * Increment rate limit counter
   */
  private incrementRateLimit(key: string, cache: Map<string, RateLimitEntry>) {
    const entry = cache.get(key);
    if (entry) {
      entry.count++;
    }
  }

  /**
   * Get rate limit status for an IP
   */
  getIpStatus(ip: string): RateLimitEntry | null {
    return this.ipCache.get(ip) || null;
  }

  /**
   * Get rate limit status for a user
   */
  getUserStatus(userId: string): RateLimitEntry | null {
    return this.userCache.get(userId) || null;
  }

  /**
   * Clear rate limit for an IP (admin action)
   */
  clearIpRateLimit(ip: string): boolean {
    return this.ipCache.delete(ip);
  }

  /**
   * Clear rate limit for a user (admin action)
   */
  clearUserRateLimit(userId: string): boolean {
    return this.userCache.delete(userId);
  }

  /**
   * Get all rate limit entries (for monitoring)
   */
  getAllRateLimits(): { ip: Map<string, RateLimitEntry>; user: Map<string, RateLimitEntry> } {
    return {
      ip: new Map(this.ipCache),
      user: new Map(this.userCache),
    };
  }
}