import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { ethers, Contract, BigNumberish, keccak256, toUtf8Bytes } from 'ethers';
import { createHash, randomBytes } from 'crypto';
import { DaService } from '../da/da.service';

/**
 * Cross-Chain Bridge Service
 * 
 * Implements two-way peg bridge for Base ↔ AFC asset transfer
 * Requirement 11.3: 开发双向锚定桥，支持资产转移及 AFC 主网资产回退至 Base
 */
@Injectable()
export class BridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BridgeService.name);
  
  // Base chain configuration
  private readonly baseRpcUrl: string;
  private readonly baseChainId: number;
  private baseProvider: ethers.JsonRpcProvider;
  private baseWallet: ethers.Wallet;
  
  // AFC chain configuration
  private readonly afcRpcUrl: string;
  private readonly afcChainId: number;
  private afcProvider: ethers.JsonRpcProvider;
  private afcWallet: ethers.Wallet;
  
  // Bridge contracts
  private baseBridgeContract: Contract;
  private afcBridgeContract: Contract;
  
  // Message verification
  private readonly messageExpiry: number;
  private readonly requiredConfirmations: number;
  
  // Fallback mechanism
  private readonly fallbackEnabled: boolean;
  private messageCache: Map<string, BridgeMessage> = new Map();
  private pendingTransfers: Map<string, TransferRequest> = new Map();
  
  // Event tracking
  private readonly eventCacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private daService: DaService,
  ) {
    // Base chain config
    this.baseRpcUrl = this.configService.get<string>('BASE_RPC_URL', 'https://sepolia.base.org');
    this.baseChainId = this.configService.get<number>('BASE_CHAIN_ID', 84532);
    
    // AFC chain config
    this.afcRpcUrl = this.configService.get<string>('AFC_RPC_URL', 'http://localhost:8545');
    this.afcChainId = this.configService.get<number>('AFC_CHAIN_ID', 12345);
    
    // Message verification config
    this.messageExpiry = this.configService.get<number>('BRIDGE_MESSAGE_EXPIRY', 24 * 60 * 60); // 24 hours
    this.requiredConfirmations = this.configService.get<number>('BRIDGE_REQUIRED_CONFIRMATIONS', 12);
    
    // Fallback config
    this.fallbackEnabled = this.configService.get<boolean>('BRIDGE_FALLBACK_ENABLED', true);
    
    // Initialize providers and wallets
    const basePrivateKey = this.configService.get<string>('BASE_PRIVATE_KEY', '');
    const afcPrivateKey = this.configService.get<string>('AFC_PRIVATE_KEY', '');
    
    this.baseProvider = new ethers.JsonRpcProvider(this.baseRpcUrl);
    this.afcProvider = new ethers.JsonRpcProvider(this.afcRpcUrl);
    
    if (basePrivateKey) {
      this.baseWallet = new ethers.Wallet(basePrivateKey, this.baseProvider);
    }
    if (afcPrivateKey) {
      this.afcWallet = new ethers.Wallet(afcPrivateKey, this.afcProvider);
    }
    
    // Initialize bridge contracts
    this.initializeContracts();
  }

  async onModuleInit() {
    this.logger.log('Initializing Cross-Chain Bridge Service');
    await this.verifyConnections();
    this.startEventListeners();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Cross-Chain Bridge Service');
    this.cleanup();
  }

  // ==================== Contract Initialization ====================

  private initializeContracts() {
    const baseBridgeAddress = this.configService.get<string>('BASE_BRIDGE_ADDRESS', '');
    const afcBridgeAddress = this.configService.get<string>('AFC_BRIDGE_ADDRESS', '');
    
    // Simplified ABI for bridge operations
    const bridgeAbi = [
      'function lockTokens(address token, uint256 amount, bytes32 destinationChain, address recipient) returns (bytes32)',
      'function unlockTokens(bytes32 transferId, address recipient, uint256 amount) returns (bool)',
      'function burnTokens(address token, uint256 amount, bytes32 destinationChain, address recipient) returns (bytes32)',
      'function mintTokens(bytes32 transferId, address recipient, uint256 amount) returns (bool)',
      'function getTransferStatus(bytes32 transferId) view returns (uint8)',
      'function verifyMessage(bytes32 messageHash, bytes32 signature) view returns (bool)',
      'event TokensLocked(bytes32 indexed transferId, address indexed sender, uint256 amount, bytes32 destinationChain, address recipient)',
      'event TokensUnlocked(bytes32 indexed transferId, address indexed recipient, uint256 amount)',
      'event TokensBurned(bytes32 indexed transferId, address indexed sender, uint256 amount, bytes32 destinationChain)',
      'event TokensMinted(bytes32 indexed transferId, address indexed recipient, uint256 amount)',
    ];
    
    if (baseBridgeAddress && this.baseWallet) {
      this.baseBridgeContract = new Contract(baseBridgeAddress, bridgeAbi, this.baseWallet);
    }
    
    if (afcBridgeAddress && this.afcWallet) {
      this.afcBridgeContract = new Contract(afcBridgeAddress, bridgeAbi, this.afcWallet);
    }
  }

  private async verifyConnections(): Promise<void> {
    try {
      const baseBlock = await this.baseProvider.getBlockNumber();
      const afcBlock = await this.afcProvider.getBlockNumber();
      this.logger.log(`Base chain connected at block ${baseBlock}, AFC chain at block ${afcBlock}`);
    } catch (error) {
      this.logger.warn(`无法验证链连接，桥接服务以降级模式运行: ${error.message}`);
      // 不抛出异常，允许服务以降级模式启动
    }
  }

  // ==================== Asset Transfer: Base → AFC ====================

  /**
   * Lock tokens on Base and initiate cross-chain transfer to AFC
   * Requirement 11.3: 实现 Base ↔ AFC 资产转移
   */
  async lockAndTransfer(params: {
    token: string;
    amount: string;
    recipient: string;
    destinationChain: 'afc' | 'base';
  }): Promise<{
    transferId: string;
    txHash: string;
    status: 'pending' | 'confirmed' | 'failed';
  }> {
    const { token, amount, recipient, destinationChain } = params;
    
    // Generate unique transfer ID
    const transferId = this.generateTransferId();
    
    // Prepare destination chain bytes
    const destChainBytes = this.getChainBytes(destinationChain);
    
    try {
      let txHash: string;
      
      if (destinationChain === 'afc') {
        // Lock on Base, mint on AFC
        if (!this.baseBridgeContract) {
          throw new Error('Base bridge contract not initialized');
        }
        
        const tx = await this.baseBridgeContract.lockTokens(
          token,
          amount,
          destChainBytes,
          recipient
        );
        
        const receipt = await tx.wait();
        txHash = receipt.hash;
        
        this.logger.log(`Tokens locked on Base: transferId=${transferId}, txHash=${txHash}`);
        
        // Store message in DA layer for verification
        await this.storeBridgeMessage({
          transferId,
          sourceChain: 'base',
          destinationChain: 'afc',
          sender: this.baseWallet.address,
          recipient,
          amount,
          token,
          txHash,
          timestamp: Date.now(),
          status: 'pending',
        });
      } else {
        // Burn on AFC, mint on Base
        if (!this.afcBridgeContract) {
          throw new Error('AFC bridge contract not initialized');
        }
        
        const tx = await this.afcBridgeContract.burnTokens(
          token,
          amount,
          destChainBytes,
          recipient
        );
        
        const receipt = await tx.wait();
        txHash = receipt.hash;
        
        this.logger.log(`Tokens burned on AFC: transferId=${transferId}, txHash=${txHash}`);
        
        // Store message in DA layer
        await this.storeBridgeMessage({
          transferId,
          sourceChain: 'afc',
          destinationChain: 'base',
          sender: this.afcWallet.address,
          recipient,
          amount,
          token,
          txHash,
          timestamp: Date.now(),
          status: 'pending',
        });
      }
      
      // Track pending transfer
      this.pendingTransfers.set(transferId, {
        transferId,
        ...params,
        txHash,
        status: 'pending',
        createdAt: Date.now(),
      });
      
      return {
        transferId,
        txHash,
        status: 'pending',
      };
    } catch (error) {
      this.logger.error(`Transfer failed: ${error.message}`);
      return {
        transferId,
        txHash: '',
        status: 'failed',
      };
    }
  }

  /**
   * Complete the transfer on destination chain
   * Called by relayer or user after confirmation
   */
  async completeTransfer(params: {
    transferId: string;
    sourceTxHash: string;
    destinationChain: 'afc' | 'base';
  }): Promise<{
    txHash: string;
    status: 'confirmed' | 'failed';
  }> {
    const { transferId, sourceTxHash, destinationChain } = params;
    
    // Verify the source transaction
    const messageVerified = await this.verifyMessage(transferId, sourceTxHash);
    if (!messageVerified) {
      throw new Error('Message verification failed');
    }
    
    try {
      let txHash: string;
      
      if (destinationChain === 'afc') {
        // Mint on AFC
        if (!this.afcBridgeContract) {
          throw new Error('AFC bridge contract not initialized');
        }
        
        const message = await this.retrieveBridgeMessage(transferId);
        if (!message) {
          throw new Error('Bridge message not found');
        }
        
        const tx = await this.afcBridgeContract.mintTokens(
          transferId,
          message.recipient,
          message.amount
        );
        
        const receipt = await tx.wait();
        txHash = receipt.hash;
        
        this.logger.log(`Tokens minted on AFC: transferId=${transferId}`);
      } else {
        // Unlock on Base
        if (!this.baseBridgeContract) {
          throw new Error('Base bridge contract not initialized');
        }
        
        const message = await this.retrieveBridgeMessage(transferId);
        if (!message) {
          throw new Error('Bridge message not found');
        }
        
        const tx = await this.baseBridgeContract.unlockTokens(
          transferId,
          message.recipient,
          message.amount
        );
        
        const receipt = await tx.wait();
        txHash = receipt.hash;
        
        this.logger.log(`Tokens unlocked on Base: transferId=${transferId}`);
      }
      
      // Update message status
      await this.updateBridgeMessageStatus(transferId, 'confirmed');
      
      // Remove from pending
      this.pendingTransfers.delete(transferId);
      
      return {
        txHash,
        status: 'confirmed',
      };
    } catch (error) {
      this.logger.error(`Complete transfer failed: ${error.message}`);
      return {
        txHash: '',
        status: 'failed',
      };
    }
  }

  // ==================== Fallback Mechanism ====================

  /**
   * Fallback mechanism for failed transfers
   * Requirement 11.3: 实现回退机制
   */
  async executeFallback(params: {
    transferId: string;
    reason: 'timeout' | 'verification_failed' | 'relay_failed';
  }): Promise<{
    success: boolean;
    refundTxHash?: string;
    message: string;
  }> {
    if (!this.fallbackEnabled) {
      return {
        success: false,
        message: 'Fallback mechanism is disabled',
      };
    }
    
    const { transferId, reason } = params;
    
    const pendingTransfer = this.pendingTransfers.get(transferId);
    if (!pendingTransfer) {
      return {
        success: false,
        message: 'Transfer not found or already completed',
      };
    }
    
    // Check if fallback is allowed based on reason
    if (reason === 'timeout') {
      const age = Date.now() - pendingTransfer.createdAt;
      if (age < this.messageExpiry * 1000) {
        return {
          success: false,
          message: 'Timeout not reached yet',
        };
      }
    }
    
    try {
      // Execute refund based on source chain
      let refundTxHash: string;
      
      if (pendingTransfer.destinationChain === 'afc') {
        // Refund from AFC bridge (unlock)
        if (!this.afcBridgeContract) {
          throw new Error('AFC bridge contract not initialized');
        }
        
        const message = await this.retrieveBridgeMessage(transferId);
        const tx = await this.afcBridgeContract.unlockTokens(
          transferId,
          message?.sender || pendingTransfer.recipient,
          pendingTransfer.amount
        );
        
        const receipt = await tx.wait();
        refundTxHash = receipt.hash;
      } else {
        // Refund from Base bridge (unlock)
        if (!this.baseBridgeContract) {
          throw new Error('Base bridge contract not initialized');
        }
        
        const message = await this.retrieveBridgeMessage(transferId);
        const tx = await this.baseBridgeContract.unlockTokens(
          transferId,
          message?.sender || pendingTransfer.recipient,
          pendingTransfer.amount
        );
        
        const receipt = await tx.wait();
        refundTxHash = receipt.hash;
      }
      
      // Update status
      await this.updateBridgeMessageStatus(transferId, 'failed');
      this.pendingTransfers.delete(transferId);
      
      this.logger.log(`Fallback executed for transfer ${transferId}, refund tx: ${refundTxHash}`);
      
      return {
        success: true,
        refundTxHash,
        message: 'Refund completed successfully',
      };
    } catch (error) {
      this.logger.error(`Fallback execution failed: ${error.message}`);
      return {
        success: false,
        message: `Fallback failed: ${error.message}`,
      };
    }
  }

  /**
   * Check if a transfer can use fallback
   */
  async canUseFallback(transferId: string): Promise<{
    allowed: boolean;
    reason?: string;
    timeRemaining?: number;
  }> {
    const pendingTransfer = this.pendingTransfers.get(transferId);
    
    if (!pendingTransfer) {
      return {
        allowed: false,
        reason: 'Transfer not found',
      };
    }
    
    const age = Date.now() - pendingTransfer.createdAt;
    const timeRemaining = this.messageExpiry * 1000 - age;
    
    if (timeRemaining > 0) {
      return {
        allowed: false,
        reason: 'Timeout not reached',
        timeRemaining,
      };
    }
    
    return { allowed: true };
  }

  // ==================== Cross-Chain Message Verification ====================

  /**
   * Verify cross-chain message authenticity
   * Requirement 11.3: 实现跨链消息验证
   */
  async verifyMessage(transferId: string, sourceTxHash: string): Promise<boolean> {
    try {
      // Retrieve message from DA layer
      const message = await this.retrieveBridgeMessage(transferId);
      
      if (!message) {
        this.logger.warn(`Message not found for transfer: ${transferId}`);
        return false;
      }
      
      // Check message expiry
      const age = Date.now() - message.timestamp;
      if (age > this.messageExpiry * 1000) {
        this.logger.warn(`Message expired for transfer: ${transferId}`);
        return false;
      }
      
      // Verify source transaction exists and is confirmed
      const sourceChain = message.sourceChain;
      const provider = sourceChain === 'base' ? this.baseProvider : this.afcProvider;
      
      const tx = await provider.getTransaction(sourceTxHash);
      if (!tx) {
        this.logger.warn(`Source transaction not found: ${sourceTxHash}`);
        return false;
      }
      
      // Check confirmations
      const receipt = await provider.getTransactionReceipt(sourceTxHash);
      const confirmations = receipt ? await receipt.confirmations() : 0;
      if (!receipt || confirmations < this.requiredConfirmations) {
        this.logger.warn(`Insufficient confirmations for: ${sourceTxHash}`);
        return false;
      }
      
      // Verify message content matches
      const expectedHash = this.hashMessage(message);
      if (expectedHash !== transferId) {
        this.logger.warn(`Message hash mismatch: ${expectedHash} !== ${transferId}`);
        return false;
      }
      
      // Verify signature if present
      if (message.signature) {
        const isValidSignature = await this.verifySignature(
          transferId,
          message.signature,
          message.sender
        );
        if (!isValidSignature) {
          this.logger.warn(`Invalid signature for transfer: ${transferId}`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Message verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Verify cryptographic signature
   */
  async verifySignature(
    messageHash: string,
    signature: string,
    expectedSigner: string
  ): Promise<boolean> {
    try {
      // Recover signer from signature
      const recoveredSigner = ethers.verifyMessage(
        toUtf8Bytes(messageHash),
        signature
      );
      
      return recoveredSigner.toLowerCase() === expectedSigner.toLowerCase();
    } catch (error) {
      this.logger.error(`Signature verification error: ${error.message}`);
      return false;
    }
  }

  /**
   * Get transfer status
   */
  async getTransferStatus(transferId: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed' | 'unknown';
    message?: string;
    confirmations?: number;
  }> {
    const message = await this.retrieveBridgeMessage(transferId);
    
    if (!message) {
      return { status: 'unknown', message: 'Transfer not found' };
    }
    
    if (message.status === 'confirmed') {
      return { status: 'confirmed' };
    }
    
    if (message.status === 'failed') {
      return { status: 'failed', message: 'Transfer failed or rolled back' };
    }
    
    // Check if we have enough confirmations
    if (message.txHash) {
      const provider = message.sourceChain === 'base' ? this.baseProvider : this.afcProvider;
      const receipt = await provider.getTransactionReceipt(message.txHash);
      
      if (receipt) {
        const confirmations = await receipt.confirmations();
        return {
          status: 'pending',
          confirmations,
        };
      }
    }
    
    return { status: 'pending' };
  }

  // ==================== DA Layer Integration ====================

  /**
   * Store bridge message in DA layer for verification
   */
  private async storeBridgeMessage(message: BridgeMessage): Promise<void> {
    const data = Buffer.from(JSON.stringify(message));
    
    // Store in DA layer
    const result = await this.daService.submitData(data, {
      namespace: `bridge_${message.destinationChain}`,
    });
    
    // Cache locally for quick access
    this.messageCache.set(message.transferId, message);
    
    this.logger.log(`Bridge message stored: transferId=${message.transferId}, provider=${result.provider}`);
  }

  /**
   * Retrieve bridge message from DA layer
   */
  private async retrieveBridgeMessage(transferId: string): Promise<BridgeMessage | null> {
    // Check local cache first
    const cached = this.messageCache.get(transferId);
    if (cached) {
      return cached;
    }
    
    // In production, would query DA layer by transferId
    // For now, return null if not in cache
    return null;
  }

  /**
   * Update bridge message status
   */
  private async updateBridgeMessageStatus(
    transferId: string,
    status: 'pending' | 'confirmed' | 'failed'
  ): Promise<void> {
    const message = this.messageCache.get(transferId);
    if (message) {
      message.status = status;
      this.messageCache.set(transferId, message);
      
      // Update in DA layer
      const data = Buffer.from(JSON.stringify(message));
      await this.daService.submitData(data, {
        namespace: `bridge_${message.destinationChain}`,
      });
    }
  }

  // ==================== Event Listeners ====================

  private startEventListeners() {
    if (this.baseBridgeContract) {
      this.baseBridgeContract.on('TokensLocked', (transferId, sender, amount, destChain, recipient) => {
        this.logger.log(`TokensLocked event: transferId=${transferId}, sender=${sender}`);
      });
      
      this.baseBridgeContract.on('TokensUnlocked', (transferId, recipient, amount) => {
        this.logger.log(`TokensUnlocked event: transferId=${transferId}, recipient=${recipient}`);
      });
    }
    
    if (this.afcBridgeContract) {
      this.afcBridgeContract.on('TokensBurned', (transferId, sender, amount, destChain) => {
        this.logger.log(`TokensBurned event: transferId=${transferId}, sender=${sender}`);
      });
      
      this.afcBridgeContract.on('TokensMinted', (transferId, recipient, amount) => {
        this.logger.log(`TokensMinted event: transferId=${transferId}, recipient=${recipient}`);
      });
    }
  }

  // ==================== Utility Functions ====================

  private generateTransferId(): string {
    const random = randomBytes(32);
    return '0x' + random.toString('hex');
  }

  private getChainBytes(chain: 'afc' | 'base'): string {
    // Convert chain name to bytes32
    const chainId = chain === 'afc' ? this.afcChainId : this.baseChainId;
    return keccak256(toUtf8Bytes(chainId.toString())).slice(0, 66);
  }

  private hashMessage(message: BridgeMessage): string {
    const data = JSON.stringify({
      sourceChain: message.sourceChain,
      destinationChain: message.destinationChain,
      sender: message.sender,
      recipient: message.recipient,
      amount: message.amount,
      token: message.token,
      timestamp: message.timestamp,
    });
    return '0x' + createHash('sha256').update(data).digest('hex');
  }

  private cleanup() {
    this.messageCache.clear();
    this.pendingTransfers.clear();
  }

  // ==================== Public API ====================

  /**
   * Get bridge statistics
   */
  async getBridgeStats(): Promise<{
    totalTransfers: number;
    pendingTransfers: number;
    confirmedTransfers: number;
    failedTransfers: number;
  }> {
    let total = 0, pending = 0, confirmed = 0, failed = 0;
    
    this.messageCache.forEach((message) => {
      total++;
      if (message.status === 'pending') pending++;
      else if (message.status === 'confirmed') confirmed++;
      else if (message.status === 'failed') failed++;
    });
    
    return {
      totalTransfers: total,
      pendingTransfers: pending,
      confirmedTransfers: confirmed,
      failedTransfers: failed,
    };
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): string[] {
    return ['base', 'afc'];
  }

  /**
   * Get bridge configuration
   */
  getConfig(): {
    baseChainId: number;
    afcChainId: number;
    messageExpiry: number;
    requiredConfirmations: number;
    fallbackEnabled: boolean;
  } {
    return {
      baseChainId: this.baseChainId,
      afcChainId: this.afcChainId,
      messageExpiry: this.messageExpiry,
      requiredConfirmations: this.requiredConfirmations,
      fallbackEnabled: this.fallbackEnabled,
    };
  }
}

// ==================== Types ====================

interface BridgeMessage {
  transferId: string;
  sourceChain: 'base' | 'afc';
  destinationChain: 'base' | 'afc';
  sender: string;
  recipient: string;
  amount: string;
  token: string;
  txHash: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  signature?: string;
}

interface TransferRequest {
  transferId: string;
  token: string;
  amount: string;
  recipient: string;
  destinationChain: 'afc' | 'base';
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: number;
}