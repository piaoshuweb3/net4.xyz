import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SecuritiesAvoidanceService } from '../securities-avoidance.service';
import { PrismaService } from '../../common/services/prisma.service';

describe('SecuritiesAvoidanceService', () => {
  let service: SecuritiesAvoidanceService;

  const mockPrismaService = {
    // Add mock methods as needed
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecuritiesAvoidanceService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                NFT_PRICE_CORE: 99999,
                NFT_PRICE_SUB: 9999,
                SERVICE_PRICE_BASIC: 99,
                SERVICE_PRICE_MEDIUM: 999,
                SERVICE_PRICE_ADVANCED: 9999,
              };
              return config[key];
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SecuritiesAvoidanceService>(SecuritiesAvoidanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkProductCompliance', () => {
    it('should return compliant result for NFT purchase', async () => {
      const result = await service.checkProductCompliance('nft', 9999, 'USDT');
      
      expect(result.allowed).toBe(true);
      expect(result.productType).toBe('nft');
      expect(result.classification).toBe('membership');
      expect(result.messaging.some(m => m.includes('technical service credential'))).toBe(true);
      expect(result.warnings.some(w => w.includes('No guarantee'))).toBe(true);
    });

    it('should return compliant result for service purchase', async () => {
      const result = await service.checkProductCompliance('service', 99, 'CREDIT_CARD');
      
      expect(result.allowed).toBe(true);
      expect(result.productType).toBe('service');
      expect(result.classification).toBe('utility');
      expect(result.messaging.some(m => m.toLowerCase().includes('service fee'))).toBe(true);
    });

    it('should return compliant result for token purchase', async () => {
      const result = await service.checkProductCompliance('token', 1000, 'USDT');
      
      expect(result.allowed).toBe(true);
      expect(result.productType).toBe('token');
      expect(result.classification).toBe('governance');
      expect(result.messaging.some(m => m.includes('governance'))).toBe(true);
    });

    it('should add warning for credit card over limit', async () => {
      const result = await service.checkProductCompliance('nft', 10000, 'CREDIT_CARD');
      
      expect(result.warnings.some(w => w.includes('Credit card'))).toBe(true);
    });

    it('should require disclosure for high-value NFT purchases', async () => {
      const result = await service.checkProductCompliance('nft', 99999, 'USDT');
      
      expect(result.requiresDisclosure).toBe(true);
    });
  });

  describe('getCompliantMessaging', () => {
    it('should return correct messaging for NFT', () => {
      const messages = service.getCompliantMessaging('nft');
      
      expect(messages.some(m => m.includes('not an investment'))).toBe(true);
      expect(messages.some(m => m.includes('technical credential'))).toBe(true);
    });

    it('should return correct messaging for service', () => {
      const messages = service.getCompliantMessaging('service');
      
      expect(messages.some(m => m.includes('not an investment'))).toBe(true);
      expect(messages.some(m => m.toLowerCase().includes('service access'))).toBe(true);
    });

    it('should return correct messaging for token', () => {
      const messages = service.getCompliantMessaging('token');
      
      expect(messages.some(m => m.includes('governance'))).toBe(true);
      expect(messages.some(m => m.includes('No financial returns'))).toBe(true);
    });
  });

  describe('validateProductDescription', () => {
    it('should pass for compliant description', async () => {
      const result = await service.validateProductDescription(
        'Spark NFT provides access to AI computing network participation rights'
      );
      
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail for description with profit promise', async () => {
      const result = await service.validateProductDescription(
        'Buy this NFT and earn profits from network activity'
      );
      
      expect(result.valid).toBe(false);
      expect(result.violations).toContain('Cannot promise profits');
    });

    it('should fail for description with ROI mention', async () => {
      const result = await service.validateProductDescription(
        'Get 20% ROI on your investment in our NFT'
      );
      
      expect(result.valid).toBe(false);
      expect(result.violations).toContain('Cannot mention ROI');
    });

    it('should fail for description with dividend promise', async () => {
      const result = await service.validateProductDescription(
        'Receive dividends from network profits'
      );
      
      expect(result.valid).toBe(false);
      expect(result.violations).toContain('Cannot promise dividends');
    });

    it('should fail for description with yield promise', async () => {
      const result = await service.validateProductDescription(
        'Earn yield on your tokens through staking'
      );
      
      expect(result.valid).toBe(false);
      expect(result.violations).toContain('Cannot promise yield');
    });
  });

  describe('getProductClassification', () => {
    it('should return correct classification for NFT', () => {
      const result = service.getProductClassification('nft');
      
      expect(result.classification).toBe('Utility/Membership Token');
      expect(result.regulatoryExemption).toContain('Not a security');
    });

    it('should return correct classification for service', () => {
      const result = service.getProductClassification('service');
      
      expect(result.classification).toBe('Service Subscription');
      expect(result.regulatoryExemption).toContain('Not a security');
    });

    it('should return correct classification for token', () => {
      const result = service.getProductClassification('token');
      
      expect(result.classification).toBe('Governance Token');
      expect(result.regulatoryExemption).toContain('Not a security');
    });
  });
});