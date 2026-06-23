import { RateLimitInterceptor } from '../interceptors/rate-limit.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';

describe('RateLimitInterceptor', () => {
  let interceptor: RateLimitInterceptor;

  const mockRequest = {
    headers: {},
    path: '/graphql',
    socket: { remoteAddress: '127.0.0.1' },
  };

  const mockResponse = {
    setHeader: jest.fn(),
    statusCode: 200,
  };

  const mockContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    }),
  } as unknown as ExecutionContext;

  const mockNext = {
    handle: jest.fn().mockReturnValue(of({ data: 'test' })),
  } as unknown as CallHandler;

  beforeEach(() => {
    interceptor = new RateLimitInterceptor();
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should allow requests within rate limit', (done) => {
      const observable = interceptor.intercept(mockContext, mockNext);
      
      observable.subscribe({
        next: (data) => {
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'X-RateLimit-Limit',
            expect.any(Number),
          );
          done();
        },
        error: done,
      });
    });

    it('should set rate limit headers', (done) => {
      const observable = interceptor.intercept(mockContext, mockNext);
      
      observable.subscribe({
        next: () => {
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'X-RateLimit-Limit',
            expect.any(Number),
          );
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'X-RateLimit-Remaining',
            expect.any(Number),
          );
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'X-RateLimit-Reset',
            expect.any(Number),
          );
          done();
        },
        error: done,
      });
    });
  });

  describe('getIpStatus', () => {
    it('should return null for unknown IP', () => {
      const status = interceptor.getIpStatus('192.168.1.1');
      expect(status).toBeNull();
    });
  });

  describe('getUserStatus', () => {
    it('should return null for unknown user', () => {
      const status = interceptor.getUserStatus('unknown-user');
      expect(status).toBeNull();
    });
  });

  describe('clearIpRateLimit', () => {
    it('should return false for unknown IP', () => {
      const result = interceptor.clearIpRateLimit('192.168.1.1');
      expect(result).toBe(false);
    });
  });

  describe('clearUserRateLimit', () => {
    it('should return false for unknown user', () => {
      const result = interceptor.clearUserRateLimit('unknown-user');
      expect(result).toBe(false);
    });
  });

  describe('getAllRateLimits', () => {
    it('should return both IP and user maps', () => {
      const result = interceptor.getAllRateLimits();
      expect(result).toHaveProperty('ip');
      expect(result).toHaveProperty('user');
      expect(result.ip).toBeInstanceOf(Map);
      expect(result.user).toBeInstanceOf(Map);
    });
  });
});