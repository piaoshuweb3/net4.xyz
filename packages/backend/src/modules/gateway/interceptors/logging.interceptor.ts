import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  ip: string;
  userAgent: string;
}

/**
 * Logging Interceptor
 * Logs all incoming requests and outgoing responses
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private requestLogs: LogEntry[] = [];
  private readonly maxLogs = 1000;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const startTime = Date.now();
    const { method, path, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';

    // Log incoming request
    this.logger.log(`→ ${method} ${path} - IP: ${ip}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - startTime;
          const statusCode = response.statusCode;

          // Create log entry
          const logEntry: LogEntry = {
            timestamp: new Date().toISOString(),
            method,
            path,
            statusCode,
            responseTime,
            ip: ip || 'unknown',
            userAgent,
          };

          // Add to logs
          this.requestLogs.push(logEntry);
          if (this.requestLogs.length > this.maxLogs) {
            this.requestLogs.shift();
          }

          // Log outgoing response
          const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';
          this.logger[logLevel](
            `← ${method} ${path} - ${statusCode} - ${responseTime}ms`,
          );
        },
        error: (error: Error) => {
          const responseTime = Date.now() - startTime;
          this.logger.error(
            `✗ ${method} ${path} - Error: ${error.message} - ${responseTime}ms`,
          );
        },
      }),
    );
  }

  /**
   * Get recent request logs
   */
  getLogs(limit = 100): LogEntry[] {
    return this.requestLogs.slice(-limit);
  }

  /**
   * Get logs by path pattern
   */
  getLogsByPath(pathPattern: string, limit = 100): LogEntry[] {
    const regex = new RegExp(pathPattern);
    return this.requestLogs.filter((log) => regex.test(log.path)).slice(-limit);
  }

  /**
   * Get logs by status code range
   */
  getLogsByStatus(statusRange: '2xx' | '3xx' | '4xx' | '5xx', limit = 100): LogEntry[] {
    const ranges: Record<string, [number, number]> = {
      '2xx': [200, 299],
      '3xx': [300, 399],
      '4xx': [400, 499],
      '5xx': [500, 599],
    };
    const [min, max] = ranges[statusRange];
    return this.requestLogs
      .filter((log) => log.statusCode >= min && log.statusCode <= max)
      .slice(-limit);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.requestLogs = [];
  }
}