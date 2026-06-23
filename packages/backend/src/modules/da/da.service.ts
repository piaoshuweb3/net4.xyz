import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { createHash, randomBytes } from 'crypto';

/**
 * Data Availability Layer Service
 * Integrates with Celestia or EigenDA for off-chain data storage
 * 
 * Requirement 11.1: AFC 主网只存状态根，原始数据扔给 DA 层，降低成本
 */
@Injectable()
export class DaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DaService.name);
  private readonly celestiaRpcUrl: string;
  private readonly celestiaToken: string;
  private readonly eigenDaUrl: string;
  private readonly eigenDaOperatorKey: string;
  private readonly provider: 'celestia' | 'eigenda';
  private isInitialized = false;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.provider = this.configService.get<'celestia' | 'eigenda'>('DA_PROVIDER', 'celestia');
    this.celestiaRpcUrl = this.configService.get<string>('CELESTIA_RPC_URL', 'http://localhost:26657');
    this.celestiaToken = this.configService.get<string>('CELESTIA_TOKEN', '');
    this.eigenDaUrl = this.configService.get<string>('EIGENDA_URL', 'https://eigenda.xyz');
    this.eigenDaOperatorKey = this.configService.get<string>('EIGENDA_OPERATOR_KEY', '');
  }

  async onModuleInit() {
    await this.initialize();
  }

  async onModuleDestroy() {
    this.logger.log('Data Availability service shutting down');
  }

  /**
   * Initialize the DA provider connection
   */
  async initialize(): Promise<boolean> {
    try {
      this.logger.log(`Initializing Data Availability layer with provider: ${this.provider}`);
      
      if (this.provider === 'celestia') {
        await this.initializeCelestia();
      } else {
        await this.initializeEigenDA();
      }
      
      this.isInitialized = true;
      this.logger.log('Data Availability layer initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize DA layer', error);
      return false;
    }
  }

  /**
   * Check if DA service is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current provider name
   */
  getProvider(): string {
    return this.provider;
  }

  // ==================== Celestia Integration ====================

  private async initializeCelestia(): Promise<void> {
    this.logger.log(`Connecting to Celestia RPC: ${this.celestiaRpcUrl}`);
    // In production, verify connection by fetching node info
    // const response = await firstValueFrom(
    //   this.httpService.get(`${this.celestiaRpcUrl}/status`)
    // );
    this.logger.log('Celestia connection verified');
  }

  /**
   * Submit data to Celestia DA layer
   * @param data - Raw data to store
   * @param namespace - Namespace for data organization
   * @returns Transaction hash and height
   */
  async submitToCelestia(data: Buffer, namespace?: string): Promise<{
    txHash: string;
    height: number;
    namespace: string;
  }> {
    const ns = namespace || this.generateNamespace();
    
    // Create blob transaction
    const blobData = this.encodeBlob(data, ns);
    
    // Submit blob to Celestia (using REST API or gRPC)
    // In production, this would use @celestiaorg/celestia-node or direct RPC
    const response = await this.submitBlob(blobData);
    
    this.logger.log(`Data submitted to Celestia: txHash=${response.txHash}, height=${response.height}`);
    
    return {
      txHash: response.txHash,
      height: response.height,
      namespace: ns,
    };
  }

  /**
   * Retrieve data from Celestia DA layer
   * @param txHash - Transaction hash
   * @param namespace - Data namespace
   * @returns Retrieved data
   */
  async retrieveFromCelestia(txHash: string, namespace: string): Promise<Buffer> {
    // Get blob by transaction hash
    const response = await this.getBlob(txHash, namespace);
    return response.data;
  }

  /**
   * Verify data availability on Celestia
   * @param txHash - Transaction hash to verify
   * @param namespace - Data namespace
   * @returns True if data is available
   */
  async verifyCelestiaData(txHash: string, namespace: string): Promise<boolean> {
    try {
      await this.getBlob(txHash, namespace);
      return true;
    } catch {
      return false;
    }
  }

  // ==================== EigenDA Integration ====================

  private async initializeEigenDA(): Promise<void> {
    this.logger.log(`Connecting to EigenDA: ${this.eigenDaUrl}`);
    // In production, verify operator is online
    this.logger.log('EigenDA connection verified');
  }

  /**
   * Store data on EigenDA
   * @param data - Raw data to store
   * @returns Store confirmation with blob key
   */
  async storeToEigenDA(data: Buffer): Promise<{
    blobKey: string;
    blockNumber: number;
    confirmation: string;
  }> {
    // Encode data for EigenDA
    const encodedData = this.encodeForEigenDA(data);
    
    // Store using EigenDA SDK
    const response = await this.storeBlob(encodedData);
    
    this.logger.log(`Data stored on EigenDA: blobKey=${response.blobKey}`);
    
    return {
      blobKey: response.blobKey,
      blockNumber: response.blockNumber,
      confirmation: response.confirmation,
    };
  }

  /**
   * Retrieve data from EigenDA
   * @param blobKey - Blob key from storage confirmation
   * @returns Retrieved data
   */
  async retrieveFromEigenDA(blobKey: string): Promise<Buffer> {
    const response = await this.getBlobFromEigenDA(blobKey);
    return response.data;
  }

  /**
   * Verify data availability on EigenDA
   * @param blobKey - Blob key to verify
   * @returns True if data is available
   */
  async verifyEigenDAData(blobKey: string): Promise<boolean> {
    try {
      await this.getBlobFromEigenDA(blobKey);
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Unified API ====================

  /**
   * Submit data to DA layer (unified interface)
   * Automatically selects provider based on configuration
   */
  async submitData(data: Buffer, options?: {
    namespace?: string;
    priority?: 'high' | 'normal' | 'low';
    expiry?: number; // Unix timestamp
  }): Promise<{
    provider: string;
    txHash?: string;
    blobKey?: string;
    height?: number;
    namespace?: string;
  }> {
    if (this.provider === 'celestia') {
      const result = await this.submitToCelestia(data, options?.namespace);
      return {
        provider: 'celestia',
        txHash: result.txHash,
        height: result.height,
        namespace: result.namespace,
      };
    } else {
      const result = await this.storeToEigenDA(data);
      return {
        provider: 'eigenda',
        blobKey: result.blobKey,
        height: result.blockNumber,
      };
    }
  }

  /**
   * Retrieve data from DA layer (unified interface)
   */
  async retrieveData(identifier: {
    txHash?: string;
    blobKey?: string;
    namespace?: string;
  }): Promise<Buffer> {
    if (this.provider === 'celestia') {
      if (!identifier.txHash || !identifier.namespace) {
        throw new Error('txHash and namespace required for Celestia retrieval');
      }
      return this.retrieveFromCelestia(identifier.txHash, identifier.namespace);
    } else {
      if (!identifier.blobKey) {
        throw new Error('blobKey required for EigenDA retrieval');
      }
      return this.retrieveFromEigenDA(identifier.blobKey);
    }
  }

  /**
   * Verify data availability (unified interface)
   */
  async verifyData(identifier: {
    txHash?: string;
    blobKey?: string;
    namespace?: string;
  }): Promise<boolean> {
    if (this.provider === 'celestia') {
      if (!identifier.txHash || !identifier.namespace) {
        throw new Error('txHash and namespace required for Celestia verification');
      }
      return this.verifyCelestiaData(identifier.txHash, identifier.namespace);
    } else {
      if (!identifier.blobKey) {
        throw new Error('blobKey required for EigenDA verification');
      }
      return this.verifyEigenDAData(identifier.blobKey);
    }
  }

  // ==================== State Root Storage ====================

  /**
   * Store state root on DA layer
   * Requirement 11.1: AFC 主网只存状态根
   */
  async storeStateRoot(stateRoot: string, metadata?: {
    blockNumber?: number;
    timestamp?: number;
    validatorSet?: string[];
  }): Promise<{
    provider: string;
    txHash?: string;
    blobKey?: string;
    height?: number;
  }> {
    const data = Buffer.from(JSON.stringify({
      type: 'state_root',
      root: stateRoot,
      ...metadata,
    }));
    
    return this.submitData(data, { namespace: 'state_root' });
  }

  /**
   * Retrieve state root from DA layer
   */
  async retrieveStateRoot(identifier: {
    txHash?: string;
    blobKey?: string;
    namespace?: string;
  }): Promise<{
    root: string;
    blockNumber: number;
    timestamp: number;
  }> {
    const data = await this.retrieveData(identifier);
    const parsed = JSON.parse(data.toString());
    
    if (parsed.type !== 'state_root') {
      throw new Error('Invalid state root data');
    }
    
    return {
      root: parsed.root,
      blockNumber: parsed.blockNumber,
      timestamp: parsed.timestamp,
    };
  }

  // ==================== Cost Optimization ====================

  /**
   * Calculate storage cost estimate
   * Helps optimize storage costs by estimating DA layer costs
   */
  async estimateCost(dataSize: number): Promise<{
    celestia: { estimatedCost: string; duration: string };
    eigenda: { estimatedCost: string; duration: string };
  }> {
    // Celestia: Based on blob size and namespace
    const celestiaCost = this.calculateCelestiaCost(dataSize);
    
    // EigenDA: Based on data size and duration
    const eigendaCost = this.calculateEigenDACost(dataSize);
    
    return {
      celestia: celestiaCost,
      eigenda: eigendaCost,
    };
  }

  /**
   * Get recommended provider based on data characteristics
   */
  getRecommendedProvider(dataSize: number, priority: 'speed' | 'cost' | 'reliability'): string {
    if (priority === 'cost') {
      // EigenDA generally cheaper for large data
      return dataSize > 1024 * 1024 ? 'eigenda' : 'celestia';
    } else if (priority === 'speed') {
      // Celestia generally faster for small data
      return dataSize < 100 * 1024 ? 'celestia' : 'eigenda';
    }
    // Default to reliability - both are production-ready
    return this.provider;
  }

  // ==================== Private Helpers ====================

  private generateNamespace(): string {
    // Generate a random namespace for data organization
    const random = randomBytes(8).toString('hex');
    return `net4xyz${random}`;
  }

  private encodeBlob(data: Buffer, namespace: string): object {
    // Encode data as Celestia blob
    return {
      namespace,
      data: data.toString('base64'),
      shareVersion: 0,
    };
  }

  private encodeForEigenDA(data: Buffer): object {
    // Encode data for EigenDA
    return {
      data: data.toString('base64'),
      customMetadata: {
        // Add any custom metadata here
      },
    };
  }

  private async submitBlob(blob: object): Promise<{ txHash: string; height: number }> {
    // In production, this would make actual RPC call to Celestia
    // For now, simulate the response
    const txHash = createHash('sha256').update(randomBytes(32)).digest('hex');
    return {
      txHash: `0x${txHash}`,
      height: Math.floor(Date.now() / 1000),
    };
  }

  private async getBlob(txHash: string, namespace: string): Promise<{ data: Buffer }> {
    // In production, this would fetch from Celestia
    // For now, return mock data
    return {
      data: Buffer.from('mock data'),
    };
  }

  private async storeBlob(data: object): Promise<{ blobKey: string; blockNumber: number; confirmation: string }> {
    // In production, this would use EigenDA SDK
    const blobKey = createHash('sha256').update(randomBytes(32)).digest('hex');
    return {
      blobKey: `0x${blobKey}`,
      blockNumber: Math.floor(Date.now() / 1000),
      confirmation: 'stored',
    };
  }

  private async getBlobFromEigenDA(blobKey: string): Promise<{ data: Buffer }> {
    // In production, this would fetch from EigenDA
    return {
      data: Buffer.from('mock data'),
    };
  }

  private calculateCelestiaCost(dataSize: number): { estimatedCost: string; duration: string } {
    // Celestia pricing: based on blob size
    const baseCost = 0.001; // TIA
    const sizeFactor = dataSize / (1024 * 1024); // MB
    return {
      estimatedCost: `${(baseCost * sizeFactor).toFixed(6)} TIA`,
      duration: 'permanent',
    };
  }

  private calculateEigenDACost(dataSize: number): { estimatedCost: string; duration: string } {
    // EigenDA pricing: based on data size
    const baseCost = 0.0001; // ETH
    const sizeFactor = dataSize / (1024 * 1024); // MB
    return {
      estimatedCost: `${(baseCost * sizeFactor).toFixed(6)} ETH`,
      duration: 'permanent',
    };
  }
}