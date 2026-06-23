import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * API Gateway Service
 * Handles request routing, authentication, rate limiting, and monitoring
 */
@Injectable()
export class GatewayService implements OnModuleInit {
  private readonly logger = new Logger(GatewayService.name);
  private requestCount = 0;
  private requestLog: Array<{
    timestamp: Date;
    method: string;
    path: string;
    statusCode: number;
    responseTime: number;
  }> = [];

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('API Gateway Service initialized');
    this.startMetricsCollection();
  }

  /**
   * Log incoming request
   */
  logRequest(request: {
    method: string;
    path: string;
    ip?: string;
    userAgent?: string;
  }) {
    this.requestCount++;
    this.logger.debug(`Request: ${request.method} ${request.path}`);
  }

  /**
   * Log outgoing response
   */
  logResponse(request: {
    method: string;
    path: string;
  }, statusCode: number, responseTime: number) {
    this.requestLog.push({
      timestamp: new Date(),
      method: request.method,
      path: request.path,
      statusCode,
      responseTime,
    });

    // Keep only last 1000 requests
    if (this.requestLog.length > 1000) {
      this.requestLog.shift();
    }

    this.logger.debug(
      `Response: ${request.method} ${request.path} - ${statusCode} (${responseTime}ms)`,
    );
  }

  /**
   * Get gateway metrics
   */
  getMetrics() {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    const recentRequests = this.requestLog.filter(
      (r) => r.timestamp > oneMinuteAgo,
    );

    const avgResponseTime =
      recentRequests.length > 0
        ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) /
          recentRequests.length
        : 0;

    const statusCounts = recentRequests.reduce(
      (acc, r) => {
        const category = r.statusCode < 400 ? '2xx' : r.statusCode < 500 ? '4xx' : '5xx';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalRequests: this.requestCount,
      requestsPerMinute: recentRequests.length,
      averageResponseTime: Math.round(avgResponseTime * 100) / 100,
      statusDistribution: statusCounts,
      uptime: process.uptime(),
    };
  }

  /**
   * Get recent request logs
   */
  getRequestLogs(limit = 100): Array<{
    timestamp: Date;
    method: string;
    path: string;
    statusCode: number;
    responseTime: number;
  }> {
    return this.requestLog.slice(-limit);
  }

  /**
   * Check if IP is blocked
   */
  isIpBlocked(ip: string): boolean {
    // In production, check against blocked IPs list
    return false;
  }

  /**
   * Get rate limit info for client
   */
  getRateLimitInfo(ip: string) {
    // In production, track per-IP rate limits
    return {
      remaining: 100,
      reset: new Date(Date.now() + 60000),
    };
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection() {
    // Log metrics every 5 minutes
    setInterval(() => {
      const metrics = this.getMetrics();
      this.logger.log(
        `Metrics: ${metrics.requestsPerMinute} req/min, ` +
        `${metrics.averageResponseTime}ms avg response time`,
      );
    }, 300000);
  }
}