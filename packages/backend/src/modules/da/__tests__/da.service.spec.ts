import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DaService } from '../da.service';

describe('DaService', () => {
  let service: DaService;

  const mockHttpService = {
    axiosRef: {
      get: jest.fn(),
      post: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        DA_PROVIDER: 'celestia',
        CELESTIA_RPC_URL: 'http://localhost:26657',
        CELESTIA_TOKEN: 'test-token',
        EIGENDA_URL: 'https://eigenda.xyz',
        EIGENDA_OPERATOR_KEY: 'test-key',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DaService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<DaService>(DaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Initialization', () => {
    it('should initialize with celestia provider', async () => {
      await service.onModuleInit();
      expect(service.isReady()).toBe(true);
      expect(service.getProvider()).toBe('celestia');
    });
  });

  describe('submitData', () => {
    it('should submit data to Celestia', async () => {
      await service.onModuleInit();
      const data = Buffer.from('test data');
      
      const result = await service.submitData(data, { namespace: 'test-ns' });
      
      expect(result.provider).toBe('celestia');
      expect(result.txHash).toBeDefined();
      expect(result.height).toBeDefined();
      expect(result.namespace).toBeDefined();
    });

    it('should submit data to EigenDA when provider is eigenda', async () => {
      const mockConfigEigenDA = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            DA_PROVIDER: 'eigenda',
            CELESTIA_RPC_URL: 'http://localhost:26657',
            CELESTIA_TOKEN: 'test-token',
            EIGENDA_URL: 'https://eigenda.xyz',
            EIGENDA_OPERATOR_KEY: 'test-key',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DaService,
          {
            provide: ConfigService,
            useValue: mockConfigEigenDA,
          },
          {
            provide: HttpService,
            useValue: mockHttpService,
          },
        ],
      }).compile();

      const eigenService = module.get<DaService>(DaService);
      await eigenService.onModuleInit();
      
      const data = Buffer.from('test data');
      const result = await eigenService.submitData(data);
      
      expect(result.provider).toBe('eigenda');
      expect(result.blobKey).toBeDefined();
      expect(result.height).toBeDefined();
    });
  });

  describe('storeStateRoot', () => {
    it('should store state root with metadata', async () => {
      await service.onModuleInit();
      
      const result = await service.storeStateRoot('0xabc123', {
        blockNumber: 12345,
        timestamp: Date.now(),
        validatorSet: ['validator1', 'validator2'],
      });
      
      expect(result.provider).toBe('celestia');
      expect(result.txHash).toBeDefined();
      expect(result.height).toBeDefined();
    });
  });

  describe('estimateCost', () => {
    it('should estimate costs for both providers', async () => {
      await service.onModuleInit();
      
      const result = await service.estimateCost(1024 * 1024); // 1MB
      
      expect(result.celestia).toBeDefined();
      expect(result.celestia.estimatedCost).toBeDefined();
      expect(result.celestia.duration).toBe('permanent');
      expect(result.eigenda).toBeDefined();
      expect(result.eigenda.estimatedCost).toBeDefined();
      expect(result.eigenda.duration).toBe('permanent');
    });
  });

  describe('getRecommendedProvider', () => {
    it('should recommend eigenda for large data when priority is cost', () => {
      const provider = service.getRecommendedProvider(2 * 1024 * 1024, 'cost');
      expect(provider).toBe('eigenda');
    });

    it('should recommend celestia for small data when priority is speed', () => {
      const provider = service.getRecommendedProvider(50 * 1024, 'speed');
      expect(provider).toBe('celestia');
    });

    it('should return default provider for reliability', () => {
      const provider = service.getRecommendedProvider(1024 * 1024, 'reliability');
      expect(provider).toBe('celestia');
    });
  });

  describe('verifyData', () => {
    it('should verify data availability for Celestia', async () => {
      await service.onModuleInit();
      
      const result = await service.verifyData({
        txHash: '0xtest123',
        namespace: 'test-ns',
      });
      
      expect(typeof result).toBe('boolean');
    });

    it('should verify data availability for EigenDA', async () => {
      await service.onModuleInit();
      
      const result = await service.verifyData({
        blobKey: '0xblob123',
      });
      
      expect(typeof result).toBe('boolean');
    });
  });
});