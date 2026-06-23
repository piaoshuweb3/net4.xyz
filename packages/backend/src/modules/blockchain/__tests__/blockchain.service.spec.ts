import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ethers, BigNumber } from 'ethers';
import { BlockchainService } from '../blockchain.service';
import { PrismaService } from '../../common/services/prisma.service';
import { NodeStatus, TaskStatus } from '@prisma/client';

// Mock ethers
jest.mock('ethers', () => {
  const mockContract = {
    balanceOf: jest.fn(),
    transfer: jest.fn(),
    approve: jest.fn(),
    stake: jest.fn(),
    unstake: jest.fn(),
    getNodeInfo: jest.fn(),
    submitWorkProof: jest.fn(),
    assignTask: jest.fn(),
    getTask: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn(),
  };

  const mockProvider = {
    getTransactionReceipt: jest.fn(),
    getTransaction: jest.fn(),
    estimateGas: jest.fn(),
    getFeeData: jest.fn(),
    getBlockNumber: jest.fn(),
    getBlock: jest.fn(),
  };

  const mockWallet = {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    sendTransaction: jest.fn(),
  };

  return {
    ethers: {
      JsonRpcProvider: jest.fn().mockImplementation(() => mockProvider),
      Wallet: jest.fn().mockImplementation(() => mockWallet),
      Contract: jest.fn().mockImplementation(() => mockContract),
      formatEther: jest.fn((bn: BigNumber) => '1.0'),
      BigNumber: {
        from: jest.fn((val: string) => ({ toString: () => val })),
      },
    },
    Contract: mockContract,
    BigNumber: {
      from: jest.fn((val: string) => ({ toString: () => val })),
    },
  };
});

// Mock PrismaService
const mockPrisma = {
  transaction: {
    upsert: jest.fn(),
  },
  node: {
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  aITask: {
    create: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
  },
};

// Mock ConfigService
const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const config: Record<string, any> = {
      BLOCKCHAIN_RPC_URL: 'https://sepolia.base.org',
      PRIVATE_KEY: '0xtestprivatekey',
      AFC_TOKEN_ADDRESS: '0xAfcTokenAddress',
      SPARK_NFT_ADDRESS: '0xSparkNftAddress',
      PUE_CONSENSUS_ADDRESS: '0xPueConsensusAddress',
    };
    return config[key] || defaultValue;
  }),
};

describe('BlockchainService', () => {
  let service: BlockchainService;
  let prismaService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BlockchainService>(BlockchainService);
    prismaService = module.get(PrismaService);
  });

  describe('Contract Call SDK - Token Operations', () => {
    /**
     * Validates: Requirements 5.1 - 封装合约调用 SDK
     * Test that getBalance returns the correct token balance
     */
    it('should return token balance for given address', async () => {
      const mockBalance = BigNumber.from('1000000000000000000'); // 1 token
      (service as any).afcToken.balanceOf.mockResolvedValue(mockBalance);

      const result = await service.getBalance('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1');

      expect(result).toBe('1000000000000000000');
      expect((service as any).afcToken.balanceOf).toHaveBeenCalledWith('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1');
    });

    /**
     * Validates: Requirements 5.1 - 封装合约调用 SDK
     * Test that transfer sends tokens and returns transaction hash
     */
    it('should transfer tokens and return transaction hash', async () => {
      const mockTx = { wait: jest.fn().mockResolvedValue({ hash: '0xTxHash' }) };
      (service as any).afcToken.transfer.mockResolvedValue(mockTx);

      const result = await service.transfer('0xRecipient', '1000');

      expect(result).toBe('0xTxHash');
      expect((service as any).afcToken.transfer).toHaveBeenCalledWith('0xRecipient', '1000');
      expect(mockTx.wait).toHaveBeenCalled();
    });

    /**
     * Validates: Requirements 5.1 - 封装合约调用 SDK
     * Test that approve allows token spending
     */
    it('should approve token spending and return transaction hash', async () => {
      const mockTx = { wait: jest.fn().mockResolvedValue({ hash: '0xApproveHash' }) };
      (service as any).afcToken.approve.mockResolvedValue(mockTx);

      const result = await service.approve('0xSpender', '5000');

      expect(result).toBe('0xApproveHash');
      expect((service as any).afcToken.approve).toHaveBeenCalledWith('0xSpender', '5000');
    });
  });

  describe('Contract Call SDK - NFT Operations', () => {
    /**
     * Validates: Requirements 5.1 - 封装合约调用 SDK
     * Test that stakeNft stakes an NFT and returns transaction hash
     */
    it('should stake NFT and return transaction hash', async () => {
      const mockTx = { wait: jest.fn().mockResolvedValue({ hash: '0xStakeHash' }) };
      (service as any).sparkNft.stake.mockResolvedValue(mockTx);

      const result = await service.stakeNft(1);

      expect(result).toBe('0xStakeHash');
      expect((service as any).sparkNft.stake).toHaveBeenCalledWith(1);
    });

    /**
     * Validates: Requirements 5.1 - 封装合约调用 SDK
     * Test that unstakeNft unstakes an NFT and returns transaction hash
     */
    it('should unstake NFT and return transaction hash', async () => {
      const mockTx = { wait: jest.fn().mockResolvedValue({ hash: '0xUnstakeHash' }) };
      (service as any).sparkNft.unstake.mockResolvedValue(mockTx);

      const result = await service.unstakeNft(1);

      expect(result).toBe('0xUnstakeHash');
      expect((service as any).sparkNft.unstake).toHaveBeenCalledWith(1);
    });

    /**
     * Validates: Requirements 5.1 - 封装合约调用 SDK
     * Test that getNodeInfo returns node information
     */
    it('should return node information for given tokenId', async () => {
      const mockNodeInfo = {
        nodeType: BigNumber.from(1),
        reputation: BigNumber.from(100),
        stakedAmount: BigNumber.from('1000000000000000000'),
      };
      (service as any).sparkNft.getNodeInfo.mockResolvedValue(mockNodeInfo);

      const result = await service.getNodeInfo(1);

      expect(result).toEqual(mockNodeInfo);
      expect((service as any).sparkNft.getNodeInfo).toHaveBeenCalledWith(1);
    });
  });

  describe('Contract Call SDK - PoUE Consensus', () => {
    /**
     * Validates: Requirements 5.1 - 封装合约调用 SDK
     * Test that submitWorkProof submits AI work proof
     */
    it('should submit work proof and return transaction hash', async () => {
      const mockTx = { wait: jest.fn().mockResolvedValue({ hash: '0xWorkProofHash' }) };
      (service as any).pueConsensus.submitWorkProof.mockResolvedValue(mockTx);

      const result = await service.submitWorkProof(1, '0xTaskHash', 'aiResult', 'zkProof');

      expect(result).toBe('0xWorkProofHash');
      expect((service as any).pueConsensus.submitWorkProof).toHaveBeenCalledWith(1, '0xTaskHash', 'aiResult', 'zkProof');
    });

    /**
     * Validates: Requirements 5.1 - 封装合约调用 SDK
     * Test that assignTask assigns a task to a node
     */
    it('should assign task to node and return transaction hash', async () => {
      const mockTx = { wait: jest.fn().mockResolvedValue({ hash: '0xAssignHash' }) };
      (service as any).pueConsensus.assignTask.mockResolvedValue(mockTx);

      const result = await service.assignTask(1);

      expect(result).toBe('0xAssignHash');
      expect((service as any).pueConsensus.assignTask).toHaveBeenCalledWith(1);
    });

    /**
     * Validates: Requirements 5.1 - 封装合约调用 SDK
     * Test that getTask returns task details
     */
    it('should return task details for given task hash', async () => {
      const mockTask = {
        hash: '0xTaskHash',
        prompt: 'Test prompt',
        reward: BigNumber.from('1000000000000000000'),
        assignedNode: '0xNodeAddress',
      };
      (service as any).pueConsensus.getTask.mockResolvedValue(mockTask);

      const result = await service.getTask('0xTaskHash');

      expect(result).toEqual(mockTask);
      expect((service as any).pueConsensus.getTask).toHaveBeenCalledWith('0xTaskHash');
    });
  });

  describe('Transaction Signing and Sending', () => {
    /**
     * Validates: Requirements 5.1 - 实现交易签名与发送
     * Test that sendTransaction sends a transaction and returns hash
     */
    it('should send transaction and return hash', async () => {
      const mockResponse = { hash: '0xSendTxHash' };
      (service as any).wallet.sendTransaction.mockResolvedValue(mockResponse);

      const result = await service.sendTransaction('0xTo', '1000', '0xData');

      expect(result).toBe('0xSendTxHash');
      expect((service as any).wallet.sendTransaction).toHaveBeenCalled();
    });

    /**
     * Validates: Requirements 5.1 - 实现交易签名与发送
     * Test that getTransactionReceipt returns receipt
     */
    it('should return transaction receipt', async () => {
      const mockReceipt = { hash: '0xTxHash', status: 1 };
      (service as any).provider.getTransactionReceipt.mockResolvedValue(mockReceipt);

      const result = await service.getTransactionReceipt('0xTxHash');

      expect(result).toEqual(mockReceipt);
      expect((service as any).provider.getTransactionReceipt).toHaveBeenCalledWith('0xTxHash');
    });

    /**
     * Validates: Requirements 5.1 - 实现交易签名与发送
     * Test that getTransaction returns transaction details
     */
    it('should return transaction details', async () => {
      const mockTx = { hash: '0xTxHash', from: '0xFrom', to: '0xTo' };
      (service as any).provider.getTransaction.mockResolvedValue(mockTx);

      const result = await service.getTransaction('0xTxHash');

      expect(result).toEqual(mockTx);
      expect((service as any).provider.getTransaction).toHaveBeenCalledWith('0xTxHash');
    });

    /**
     * Validates: Requirements 5.1 - 实现交易签名与发送
     * Test that estimateGas returns gas estimate
     */
    it('should estimate gas for transaction', async () => {
      const mockEstimate = BigNumber.from('21000');
      (service as any).provider.estimateGas.mockResolvedValue(mockEstimate);

      const result = await service.estimateGas('0xTo', '1000');

      expect(result).toBe('21000');
    });

    /**
     * Validates: Requirements 5.1 - 实现交易签名与发送
     * Test that getGasPrice returns current gas price
     */
    it('should return current gas price', async () => {
      const mockFeeData = { gasPrice: BigNumber.from('1000000000') };
      (service as any).provider.getFeeData.mockResolvedValue(mockFeeData);

      const result = await service.getGasPrice();

      expect(result).toBe('1000000000');
    });
  });

  describe('Event Listening and Handling', () => {
    /**
     * Validates: Requirements 5.1 - 实现事件监听与处理
     * Test that event listeners are set up on module init
     */
    it('should set up event listeners on initialization', async () => {
      await service.onModuleInit();

      expect((service as any).afcToken.on).toHaveBeenCalled();
      expect((service as any).sparkNft.on).toHaveBeenCalled();
      expect((service as any).pueConsensus.on).toHaveBeenCalled();
    });

    /**
     * Validates: Requirements 5.1 - 实现事件监听与处理
     * Test that event listeners are removed on module destroy
     */
    it('should remove event listeners on destruction', async () => {
      (service as any).eventListeners.set('Transfer', {} as any);
      (service as any).eventListeners.set('Staked', {} as any);

      await service.onModuleDestroy();

      expect((service as any).afcToken.removeAllListeners).toHaveBeenCalled();
    });
  });

  describe('On-Chain Data Sync', () => {
    /**
     * Validates: Requirements 5.1 - 实现链上数据同步
     * Test that syncNodeData syncs node data from chain
     */
    it('should sync node data from chain', async () => {
      const mockNodeInfo = {
        nodeType: BigNumber.from(1),
        reputation: BigNumber.from(100),
        stakedAmount: BigNumber.from('1000000000000000000'),
      };
      (service as any).sparkNft.getNodeInfo.mockResolvedValue(mockNodeInfo);
      mockPrisma.node.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.syncNodeData(1);

      expect(result).toEqual(mockNodeInfo);
      expect(mockPrisma.node.updateMany).toHaveBeenCalled();
    });

    /**
     * Validates: Requirements 5.1 - 实现链上数据同步
     * Test that syncTaskData syncs task data from chain
     */
    it('should sync task data from chain', async () => {
      const mockTask = {
        hash: '0xTaskHash',
        prompt: 'Test prompt',
        reward: BigNumber.from('1000000000000000000'),
        assignedNode: '0xNodeAddress',
      };
      (service as any).pueConsensus.getTask.mockResolvedValue(mockTask);
      mockPrisma.aITask.upsert.mockResolvedValue(mockTask);

      const result = await service.syncTaskData('0xTaskHash');

      expect(result).toEqual(mockTask);
      expect(mockPrisma.aITask.upsert).toHaveBeenCalled();
    });
  });

  describe('Utility Functions', () => {
    /**
     * Validates: Requirements 5.1 - 封装合约调用 SDK
     * Test that getWalletAddress returns the wallet address
     */
    it('should return wallet address', () => {
      const result = service.getWalletAddress();

      expect(result).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1');
    });

    /**
     * Validates: Requirements 5.1 - 封装合约调用 SDK
     * Test that getBlockNumber returns current block number
     */
    it('should return current block number', async () => {
      (service as any).provider.getBlockNumber.mockResolvedValue(12345);

      const result = await service.getBlockNumber();

      expect(result).toBe(12345);
    });

    /**
     * Validates: Requirements 5.1 - 封装合约调用 SDK
     * Test that getBlock returns block information
     */
    it('should return block information', async () => {
      const mockBlock = { number: 12345, timestamp: 1234567890 };
      (service as any).provider.getBlock.mockResolvedValue(mockBlock);

      const result = await service.getBlock(12345);

      expect(result).toEqual(mockBlock);
    });
  });
});