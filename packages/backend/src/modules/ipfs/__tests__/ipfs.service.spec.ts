import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IpfsService } from '../ipfs.service';

describe('IpfsService', () => {
  let service: IpfsService;
  let mockIpfs: any;

  beforeEach(async () => {
    mockIpfs = {
      id: jest.fn().mockResolvedValue({
        id: 'QmTestNode123',
        agentVersion: 'kubo/0.24.0',
        protocolVersion: 'ipfs/0.1.0',
      }),
      add: jest.fn().mockResolvedValue({
        cid: {
          toString: () => 'QmTestCID123456789',
        },
      }),
      files: {
        stat: jest.fn().mockResolvedValue({
          cid: { toString: () => 'QmTestCID123456789' },
          size: 1000,
          cumulativeSize: 2000,
          blocks: 1,
          type: 'file',
        }),
      },
      pin: {
        add: jest.fn().mockResolvedValue({}),
        rm: jest.fn().mockResolvedValue({}),
        ls: jest.fn().mockReturnValue([
          { cid: { toString: () => 'QmPin1' }, type: 'recursive' },
          { cid: { toString: () => 'QmPin2' }, type: 'direct' },
        ]),
      },
      cat: jest.fn().mockReturnValue([Buffer.from('{"test":"data"}')]),
      swarm: {
        peers: jest.fn().mockReturnValue([
          { addr: { toString: () => '/ip4/1.2.3.4/tcp/4001' }, peer: { toString: () => 'QmPeer1' } },
        ]),
      },
      stop: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpfsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                IPFS_URL: 'http://localhost:5001',
                IPFS_GATEWAY: 'http://localhost:8080',
                IPFS_CLUSTER_PEERS: '',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<IpfsService>(IpfsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getGatewayUrl', () => {
    it('should return the gateway URL', () => {
      const gatewayUrl = service.getGatewayUrl();
      expect(gatewayUrl).toBe('http://localhost:8080');
    });
  });

  describe('getFileUrl', () => {
    it('should return the full gateway URL for a CID', () => {
      const cid = 'QmTestCID123';
      const fileUrl = service.getFileUrl(cid);
      expect(fileUrl).toBe(`http://localhost:8080/ipfs/${cid}`);
    });
  });

  describe('getClusterPeers', () => {
    it('should return an empty array when no peers configured', () => {
      const peers = service.getClusterPeers();
      expect(peers).toEqual([]);
    });
  });

  describe('isIpfsConnected', () => {
    it('should return false when not connected', () => {
      const connected = service.isIpfsConnected();
      expect(connected).toBe(false);
    });
  });
});