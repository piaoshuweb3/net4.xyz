import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

// Mock Arweave before importing the service
const mockArweave = {
  init: jest.fn().mockReturnValue({
    network: {
      getInfo: jest.fn().mockResolvedValue({
        network: 'arweave.testnet',
        version: '0.0.0',
        height: 1000000,
        release: '0.0.0',
      }),
    },
    wallets: {
      getAddress: jest.fn().mockResolvedValue('test-wallet-address'),
      getBalance: jest.fn().mockResolvedValue('1000000000000'),
      getLastTransactionID: jest.fn().mockResolvedValue('tx-id'),
    },
    transactions: {
      getStatus: jest.fn().mockResolvedValue({
        status: 200,
        confirmed: { block_height: 1000000, block_indep_hash: 'block-hash' },
      }),
      get: jest.fn().mockResolvedValue({
        id: 'test-tx-id',
        owner: 'test-owner',
        tags: [
          { name: 'App-Name', value: 'net4xyz' },
          { name: 'Content-Type', value: 'text/plain' },
          { name: 'Timestamp', value: '1234567890' },
        ],
        fee: '1000',
        quantity: '0',
      }),
      getData: jest.fn().mockResolvedValue(Buffer.from('test data')),
      createTransaction: jest.fn().mockResolvedValue({
        addTag: jest.fn(),
        sign: jest.fn().mockResolvedValue(undefined),
        post: jest.fn().mockResolvedValue({ status: 200 }),
      }),
      sign: jest.fn().mockResolvedValue(undefined),
      post: jest.fn().mockResolvedValue({ status: 200 }),
    },
    crypto: {
      hash: jest.fn().mockResolvedValue(Buffer.from('hash-data')),
    },
    ar: {
      winstonToAr: jest.fn().mockReturnValue('1.0'),
    },
  }),
};

jest.mock('arweave', () => ({
  default: mockArweave,
  __esModule: true,
}));

import { ArweaveService } from '../arweave.service';

describe('ArweaveService', () => {
  let service: ArweaveService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArweaveService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                ARWEAVE_HOST: 'arweave.net',
                ARWEAVE_PORT: '443',
                ARWEAVE_HTTPS: 'true',
                ARWEAVE_WALLET_JWK: '',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ArweaveService>(ArweaveService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getGatewayUrl', () => {
    it('should return the gateway URL', () => {
      const gatewayUrl = service.getGatewayUrl();
      expect(gatewayUrl).toBe('https://arweave.net');
    });
  });

  describe('getFileUrl', () => {
    it('should return the full gateway URL for a transaction', () => {
      const transactionId = 'test-tx-id';
      const fileUrl = service.getFileUrl(transactionId);
      expect(fileUrl).toBe(`https://arweave.net/${transactionId}`);
    });
  });

  describe('isConnected', () => {
    it('should return false when not initialized', () => {
      const connected = service.isConnected();
      expect(connected).toBe(false);
    });
  });

  describe('getWalletAddress', () => {
    it('should return null when no wallet configured', async () => {
      const address = await service.getWalletAddress();
      expect(address).toBeNull();
    });
  });
});