import { Resolver, Query, Mutation, Args, Int, ObjectType, Field, Float } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { RateLimitInterceptor } from './interceptors/rate-limit.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Public } from './decorators/public.decorator';

@ObjectType()
export class GatewayMetrics {
  @Field(() => Int)
  totalRequests: number;

  @Field(() => Int)
  requestsPerMinute: number;

  @Field(() => Float)
  averageResponseTime: number;

  @Field(() => String)
  uptime: string;

  @Field(() => String, { nullable: true })
  statusDistribution: string;
}

@ObjectType()
export class RequestLogEntry {
  @Field(() => String)
  timestamp: string;

  @Field(() => String)
  method: string;

  @Field(() => String)
  path: string;

  @Field(() => Int)
  statusCode: number;

  @Field(() => Int)
  responseTime: number;

  @Field(() => String, { nullable: true })
  ip: string;
}

@ObjectType()
export class RateLimitStatus {
  @Field(() => Int)
  remaining: number;

  @Field(() => String)
  reset: string;
}

@Resolver(() => GatewayMetrics)
export class GatewayResolver {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly rateLimitInterceptor: RateLimitInterceptor,
    private readonly loggingInterceptor: LoggingInterceptor,
  ) {}

  /**
   * Get gateway metrics
   */
  @Query(() => GatewayMetrics)
  @Public()
  async getGatewayMetrics() {
    const metrics = this.gatewayService.getMetrics();
    return {
      totalRequests: metrics.totalRequests,
      requestsPerMinute: metrics.requestsPerMinute,
      averageResponseTime: metrics.averageResponseTime,
      uptime: `${Math.floor(metrics.uptime / 3600)}h ${Math.floor((metrics.uptime % 3600) / 60)}m`,
      statusDistribution: JSON.stringify(metrics.statusDistribution),
    };
  }

  /**
   * Get recent request logs
   */
  @Query(() => [RequestLogEntry])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getRequestLogs(@Args('limit', { type: () => Int, defaultValue: 100 }) limit: number) {
    const logs = this.loggingInterceptor.getLogs(limit);
    return logs.map((log) => ({
      ...log,
      timestamp: log.timestamp,
    }));
  }

  /**
   * Get logs by path pattern
   */
  @Query(() => [RequestLogEntry])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getLogsByPath(
    @Args('pathPattern', { type: () => String }) pathPattern: string,
    @Args('limit', { type: () => Int, defaultValue: 100 }) limit: number,
  ) {
    const logs = this.loggingInterceptor.getLogsByPath(pathPattern, limit);
    return logs.map((log) => ({
      ...log,
      timestamp: log.timestamp,
    }));
  }

  /**
   * Get logs by status code
   */
  @Query(() => [RequestLogEntry])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getLogsByStatus(
    @Args('statusRange', { type: () => String }) statusRange: '2xx' | '3xx' | '4xx' | '5xx',
    @Args('limit', { type: () => Int, defaultValue: 100 }) limit: number,
  ) {
    const logs = this.loggingInterceptor.getLogsByStatus(statusRange, limit);
    return logs.map((log) => ({
      ...log,
      timestamp: log.timestamp,
    }));
  }

  /**
   * Get rate limit status for an IP
   */
  @Query(() => RateLimitStatus)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getRateLimitStatus(@Args('ip', { type: () => String }) ip: string) {
    const status = this.rateLimitInterceptor.getIpStatus(ip);
    if (!status) {
      return {
        remaining: 100,
        reset: new Date(Date.now() + 60000).toISOString(),
      };
    }
    return {
      remaining: Math.max(0, 100 - status.count),
      reset: new Date(status.resetTime).toISOString(),
    };
  }

  /**
   * Clear rate limit for an IP (admin action)
   */
  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async clearRateLimit(@Args('ip', { type: () => String }) ip: string) {
    return this.rateLimitInterceptor.clearIpRateLimit(ip);
  }

  /**
   * Clear all request logs (admin action)
   */
  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async clearRequestLogs() {
    this.loggingInterceptor.clearLogs();
    return true;
  }
}