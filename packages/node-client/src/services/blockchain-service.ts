import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import log from 'electron-log';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import type { HardwareInfo } from './hardware-detector';

// Chain configuration
const CHAIN_CONFIG = {
  base: {
    id: 8453,
    name: 'Base',
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
  },
  baseSepolia: {
    id: 84532,
    name: 'Base Sepolia',
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
  },
};

// Contract addresses (placeholder - should be updated with actual addresses)
const CONTRACT_ADDRESSES = {
  nodeRegistry: process.env.NODE_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000',
  sparkNFT: process.env.SPARK_NFT_ADDRESS || '0x0000000000000000000000000000000000000000',
  afcToken: process.env.AFC_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
};

export interface NodeRegistration {
  nodeId: string;
  walletAddress: string;
  hardwareInfo: HardwareInfo;
  timestamp: number;
  stakeAmount: string;
}

export interface NodeStatus {
  nodeId: string;
  status: 'active' | 'inactive' | 'penalty' | 'unregistered';
  stakedAmount: string;
  reputation: number;
  totalTasks: number;
  completedTasks: number;
  lastActive: number;
}

export class BlockchainService {
  private publicClient: ReturnType<typeof createPublicClient> | null = null;
  private walletClient: ReturnType<typeof createWalletClient> | null = null;
  private walletAddress: string | null = null;
  private chainId: number;
  private configPath: string;

  constructor(chainId: number = 84532) { // Default to Base Sepolia testnet
    this.chainId = chainId;
    this.configPath = path.join(app.getPath('userData'), 'config.json');
    this.initializeClient();
  }

  private initializeClient(): void {
    const chain = this.chainId === 8453 ? CHAIN_CONFIG.base : CHAIN_CONFIG.baseSepolia;
    
    this.publicClient = createPublicClient({
      chain: {
        id: chain.id,
        name: chain.name,
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
        },
        rpc: {
          http: chain.rpcUrl,
        },
      },
      transport: http(),
    });

    log.info(`Blockchain client initialized for ${chain.name} (chain ID: ${chain.id})`);
  }

  async connect(walletAddress: string): Promise<void> {
    this.walletAddress = walletAddress;
    
    // For now, we use a read-only client
    // In production, this would integrate with wallet (MetaMask, etc.)
    log.info(`Connected to wallet: ${walletAddress}`);
  }

  async getBalance(address: string): Promise<string> {
    if (!this.publicClient) {
      throw new Error('Public client not initialized');
    }

    try {
      const balance = await this.publicClient.getBalance({ address: address as `0x${string}` });
      return formatEther(balance);
    } catch (error) {
      log.error('Error getting balance:', error);
      throw error;
    }
  }

  async registerNode(hardwareInfo: HardwareInfo): Promise<NodeRegistration> {
    if (!this.walletAddress) {
      throw new Error('Wallet not connected');
    }

    // Generate a unique node ID based on hardware info
    const nodeId = this.generateNodeId(hardwareInfo);

    const registration: NodeRegistration = {
      nodeId,
      walletAddress: this.walletAddress,
      hardwareInfo,
      timestamp: Date.now(),
      stakeAmount: '0', // Will be set when staking
    };

    // Save registration locally (in production, this would submit to blockchain)
    this.saveRegistration(registration);

    log.info(`Node registered: ${nodeId}`);
    return registration;
  }

  async stake(amount: string): Promise<{ transactionHash: string; nodeId: string }> {
    if (!this.walletAddress) {
      throw new Error('Wallet not connected');
    }

    // Load registration to get node ID
    const registration = this.loadRegistration();
    if (!registration) {
      throw new Error('Node not registered. Please register first.');
    }

    // In production, this would:
    // 1. Create a transaction to call stake() on the NodeRegistry contract
    // 2. Sign and send the transaction
    // 3. Wait for confirmation
    
    // For now, simulate a transaction
    const mockTxHash = `0x${Buffer.from(`tx_${Date.now()}`).toString('hex')}`;
    
    registration.stakeAmount = amount;
    this.saveRegistration(registration);

    log.info(`Staked ${amount} ETH for node ${registration.nodeId}`);
    
    return {
      transactionHash: mockTxHash,
      nodeId: registration.nodeId,
    };
  }

  async getNodeStatus(nodeId: string): Promise<NodeStatus | null> {
    // In production, this would query the blockchain
    // For now, return mock data
    return {
      nodeId,
      status: 'active',
      stakedAmount: '1.0',
      reputation: 100,
      totalTasks: 0,
      completedTasks: 0,
      lastActive: Date.now(),
    };
  }

  async submitTaskResult(
    nodeId: string,
    taskId: string,
    result: string,
    proof: string
  ): Promise<{ transactionHash: string }> {
    if (!this.walletAddress) {
      throw new Error('Wallet not connected');
    }

    // In production, this would submit the result and proof to the blockchain
    const mockTxHash = `0x${Buffer.from(`task_${Date.now()}`).toString('hex')}`;
    
    log.info(`Task result submitted: taskId=${taskId}, nodeId=${nodeId}`);
    
    return {
      transactionHash: mockTxHash,
    };
  }

  private generateNodeId(hardwareInfo: HardwareInfo): string {
    // Generate a unique node ID based on hardware characteristics
    const data = JSON.stringify({
      cpu: hardwareInfo.cpu.model,
      cores: hardwareInfo.cpu.cores,
      memory: hardwareInfo.memory.total,
      platform: hardwareInfo.platform,
      timestamp: Date.now(),
    });
    
    // Simple hash for node ID (in production, use proper hashing)
    const hash = Buffer.from(data).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    return `node_${hash}`;
  }

  private saveRegistration(registration: NodeRegistration): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(registration, null, 2));
    } catch (error) {
      log.error('Error saving registration:', error);
    }
  }

  private loadRegistration(): NodeRegistration | null {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      log.error('Error loading registration:', error);
    }
    return null;
  }

  getWalletAddress(): string | null {
    return this.walletAddress;
  }

  getChainId(): number {
    return this.chainId;
  }

  getExplorerUrl(txHash: string): string {
    const chain = this.chainId === 8453 ? CHAIN_CONFIG.base : CHAIN_CONFIG.baseSepolia;
    return `${chain.explorer}/tx/${txHash}`;
  }
}