import { Test, TestingModule } from '@nestjs/testing';
import { GatewayService } from '../gateway.service';
import { ConfigService } from '@nestjs/config';

describe('GatewayService', () => {
  let service: GatewayService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        API_GATEWAY_ENABLED: true,
        API_GATEWAY_METRICS_INTERVAL: 300000,
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GatewayService>(GatewayService);
  });

  describe('logRequest', () => {
    it('should log incoming request', () => {
      const request = {
        method: 'GET',
        path: '/graphql',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      // Should not throw
      expect(() => service.logRequest(request)).not.toThrow();
    });
  });

  describe('logResponse', () => {
    it('should log response with timing', () => {
      const request = {
        method: 'GET',
        path: '/graphql',
      };

      expect(() => service.logResponse(request, 200, 150)).not.toThrow();
    });
  });

  describe('getMetrics', () => {
    it('should return metrics object', () => {
      const metrics = service.getMetrics();

      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('requestsPerMinute');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('statusDistribution');
      expect(metrics).toHaveProperty('uptime');
    });

    it('should track request count', () => {
      const initialMetrics = service.getMetrics();
      const initialCount = initialMetrics.totalRequests;

      service.logRequest({ method: 'GET', path: '/test' });
      service.logResponse({ method: 'GET', path: '/test' }, 200, 100);

      const updatedMetrics = service.getMetrics();
      expect(updatedMetrics.totalRequests).toBe(initialCount + 1);
    });
  });

  describe('getRequestLogs', () => {
    it('should return request logs', () => {
      const logs = service.getRequestLogs(10);
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should respect limit parameter', () => {
      // Add some logs
      for (let i = 0; i < 20; i++) {
        service.logRequest({ method: 'GET', path: `/test${i}` });
        service.logResponse({ method: 'GET', path: `/test${i}` }, 200, 100);
      }

      const logs = service.getRequestLogs(5);
      expect(logs.length).toBeLessThanOrEqual(5);
    });
  });

  describe('isIpBlocked', () => {
    it('should return false for non-blocked IPs', () => {
      expect(service.isIpBlocked('127.0.0.1')).toBe(false);
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return rate limit info', () => {
      const info = service.getRateLimitInfo('127.0.0.1');
      expect(info).toHaveProperty('remaining');
      expect(info).toHaveProperty('reset');
    });
  });
});