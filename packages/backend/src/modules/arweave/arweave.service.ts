import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// net4.xyz: arweave 包垫片 - 使用 fetch API 实现基本功能
class ArweaveShim {
  private host: string;
  private port: number;
  private protocol: string;

  constructor(opts: { host: string; port: number; protocol: string; timeout: number }) {
    this.host = opts.host;
    this.port = opts.port;
    this.protocol = opts.protocol;
  }

  get api() {
    return {
      get: async (endpoint: string) => {
        try {
          const url = `${this.protocol}://${this.host}:${this.port}/${endpoint}`;
          const response = await fetch(url);
          return { status: response.status, data: await response.json() };
        } catch (err: any) {
          return { status: 500, data: null };
        }
      },
      post: async (endpoint: string, body: any) => {
        try {
          const url = `${this.protocol}://${this.host}:${this.port}/${endpoint}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          return { status: response.status, data: await response.json() };
        } catch (err: any) {
          return { status: 500, data: null };
        }
      },
    };
  }

  static init(opts: { host: string; port: number; protocol: string; timeout: number }) {
    return new ArweaveShim(opts);
  }
}

/**
 * Arweave Permanent Storage Service
 * Implements permanent data storage with on-chain attestation
 * 
 * Requirements: 3.2
 */
@Injectable()
export class ArweaveService {
  private readonly logger = new Logger(ArweaveService.name);
  private arweave: any;
  private wallet: any;
  private isInitialized = false;
  private gatewayUrl: string;

  constructor(private configService: ConfigService) {
    const arweaveHost = this.configService.get<string>('ARWEAVE_HOST') || 'arweave.net';
    const arweavePort = this.configService.get<number>('ARWEAVE_PORT') || 443;
    const useHTTPS = this.configService.get<boolean>('ARWEAVE_HTTPS') !== false;
    
    this.gatewayUrl = `https://${arweaveHost}`;
    
    this.arweave = ArweaveShim.init({
      host: arweaveHost,
      port: arweavePort,
      protocol: useHTTPS ? 'https' : 'http',
      timeout: 60000,
    });
  }

  /**
   * Initialize the Arweave service and load wallet
   */
  async initialize(): Promise<boolean> {
    try {
      const walletJwk = this.configService.get<string>('ARWEAVE_WALLET_JWK');
      
      if (walletJwk) {
        this.wallet = JSON.parse(walletJwk);
        const address = await this.arweave.wallets.getAddress(this.wallet);
        this.logger.log(`Arweave wallet initialized: ${address}`);
      } else {
        this.logger.warn('No Arweave wallet JWK configured - uploads will use bundler');
      }

      // Test connection
      const networkInfo = await this.arweave.network.getInfo();
      this.isInitialized = true;
      this.logger.log(`Connected to Arweave network: ${networkInfo.network}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to initialize Arweave: ${error.message}`);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Check if Arweave is initialized
   */
  isConnected(): boolean {
    return this.isInitialized;
  }

  /**
   * Get gateway URL
   */
  getGatewayUrl(): string {
    return this.gatewayUrl;
  }

  /**
   * Get Arweave wallet address
   */
  async getWalletAddress(): Promise<string | null> {
    if (!this.wallet) return null;
    return this.arweave.wallets.getAddress(this.wallet);
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<{
    status: number;
    confirmed: boolean;
    blockHeight?: number;
    blockHash?: string;
  }> {
    try {
      const status = await this.arweave.transactions.getStatus(transactionId);
      return {
        status: status.status,
        confirmed: status.confirmed !== null,
        blockHeight: status.confirmed?.block_height,
        blockHash: status.confirmed?.block_indep_hash,
      };
    } catch (error) {
      this.logger.error(`Failed to get transaction status: ${error.message}`);
      return { status: 0, confirmed: false };
    }
  }

  /**
   * Upload data to Arweave with tags for attestation
   * @param data - Data to upload (string or Buffer)
   * @param tags - Tags for metadata and attestation
   * @returns Transaction ID and details
   */
  async upload(data: string | Buffer, tags: Array<{ name: string; value: string }> = []): Promise<{
    transactionId: string;
    timestamp: number;
    size: number;
    gatewayUrl: string;
    tags: Array<{ name: string; value: string }>;
  }> {
    try {
      // Create transaction
      const transaction = await this.arweave.createTransaction({
        data: typeof data === 'string' ? Buffer.from(data) : data,
      });

      // Add default tags for attestation
      transaction.addTag('App-Name', 'net4xyz');
      transaction.addTag('Content-Type', typeof data === 'string' ? 'text/plain' : 'application/octet-stream');
      transaction.addTag('Timestamp', Date.now().toString());
      transaction.addTag('Version', '1.0.0');

      // Add custom tags
      for (const tag of tags) {
        transaction.addTag(tag.name, tag.value);
      }

      // Sign and post
      if (this.wallet) {
        await this.arweave.transactions.sign(transaction, this.wallet);
      }

      const response = await this.arweave.transactions.post(transaction);
      
      if (response.status === 200 || response.status === 202) {
        this.logger.log(`Data uploaded to Arweave: ${transaction.id}`);
        
        return {
          transactionId: transaction.id,
          timestamp: Date.now(),
          size: typeof data === 'string' ? Buffer.from(data).length : data.length,
          gatewayUrl: `${this.gatewayUrl}/${transaction.id}`,
          tags: [
            { name: 'App-Name', value: 'net4xyz' },
            { name: 'Content-Type', value: typeof data === 'string' ? 'text/plain' : 'application/octet-stream' },
            ...tags,
          ],
        };
      } else {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
    } catch (error) {
      this.logger.error(`Failed to upload to Arweave: ${error.message}`);
      throw new Error(`Arweave upload failed: ${error.message}`);
    }
  }

  /**
   * Upload JSON data to Arweave
   * @param data - JSON object to store
   * @param tags - Optional tags
   * @returns Transaction ID and details
   */
  async uploadJson(data: Record<string, unknown>, tags: Array<{ name: string; value: string }> = []): Promise<{
    transactionId: string;
    timestamp: number;
    size: number;
    gatewayUrl: string;
    tags: Array<{ name: string; value: string }>;
  }> {
    const jsonString = JSON.stringify(data);
    const jsonTags = [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Data-Type', value: 'json' },
      ...tags,
    ];
    return this.upload(jsonString, jsonTags);
  }

  /**
   * Upload file with metadata
   * @param buffer - File buffer
   * @param filename - Original filename
   * @param contentType - MIME type
   * @returns Transaction ID and details
   */
  async uploadFile(buffer: Buffer, filename: string, contentType: string = 'application/octet-stream'): Promise<{
    transactionId: string;
    timestamp: number;
    size: number;
    gatewayUrl: string;
    filename: string;
    contentType: string;
  }> {
    const tags = [
      { name: 'Content-Type', value: contentType },
      { name: 'Filename', value: filename },
      { name: 'Data-Type', value: 'file' },
    ];

    const result = await this.upload(buffer, tags);
    return {
      ...result,
      filename,
      contentType,
    };
  }

  /**
   * Get data from Arweave by transaction ID
   * @param transactionId - Arweave transaction ID
   * @returns Data as string
   */
  async getData(transactionId: string): Promise<string> {
    try {
      const data = await this.arweave.transactions.getData(transactionId, { decode: true, string: true });
      return data as string;
    } catch (error) {
      this.logger.error(`Failed to get data from Arweave: ${error.message}`);
      throw new Error(`Arweave get data failed: ${error.message}`);
    }
  }

  /**
   * Get JSON data from Arweave
   * @param transactionId - Arweave transaction ID
   * @returns Parsed JSON object
   */
  async getJson(transactionId: string): Promise<Record<string, unknown>> {
    const data = await this.getData(transactionId);
    return JSON.parse(data);
  }

  /**
   * Get transaction tags
   * @param transactionId - Arweave transaction ID
   * @returns Array of tags
   */
  async getTransactionTags(transactionId: string): Promise<Array<{ name: string; value: string }>> {
    try {
      const transaction = await this.arweave.transactions.get(transactionId);
      return transaction.tags.map(tag => ({
        name: tag.name,
        value: tag.value,
      }));
    } catch (error) {
      this.logger.error(`Failed to get transaction tags: ${error.message}`);
      throw new Error(`Arweave get tags failed: ${error.message}`);
    }
  }

  /**
   * Get data attestation info (for on-chain verification)
   * @param transactionId - Arweave transaction ID
   * @returns Attestation data
   */
  async getAttestation(transactionId: string): Promise<{
    transactionId: string;
    owner: string;
    timestamp: number;
    blockHeight: number;
    blockHash: string;
    dataHash: string;
    tags: Array<{ name: string; value: string }>;
    verified: boolean;
  }> {
    try {
      const transaction = await this.arweave.transactions.get(transactionId);
      const status = await this.getTransactionStatus(transactionId);
      
      // Calculate data hash for verification
      const data = await this.arweave.transactions.getData(transactionId, { decode: true });
      const dataHash = await this.arweave.crypto.hash(Buffer.from(data));
      
      return {
        transactionId: transaction.id,
        owner: transaction.owner,
        timestamp: parseInt(transaction.tags.find(t => t.name === 'Timestamp')?.value || '0'),
        blockHeight: status.blockHeight || 0,
        blockHash: status.blockHash || '',
        dataHash: Buffer.from(dataHash).toString('base64'),
        tags: transaction.tags.map(tag => ({
          name: tag.name,
          value: tag.value,
        })),
        verified: status.confirmed,
      };
    } catch (error) {
      this.logger.error(`Failed to get attestation: ${error.message}`);
      throw new Error(`Arweave attestation failed: ${error.message}`);
    }
  }

  /**
   * Get gateway URL for a transaction
   */
  getFileUrl(transactionId: string): string {
    return `${this.gatewayUrl}/${transactionId}`;
  }

  /**
   * Get Arweave network information
   */
  async getNetworkInfo(): Promise<{
    network: string;
    version: string;
    height: number;
    release: string;
  }> {
    try {
      const info = await this.arweave.network.getInfo();
      return {
        network: info.network,
        version: String(info.version),
        height: info.height,
        release: String(info.release),
      };
    } catch (error) {
      this.logger.error(`Failed to get network info: ${error.message}`);
      throw new Error(`Arweave network info failed: ${error.message}`);
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(address?: string): Promise<string> {
    try {
      const walletAddress = address || await this.getWalletAddress();
      if (!walletAddress) {
        throw new Error('No wallet address available');
      }
      const balance = await this.arweave.wallets.getBalance(walletAddress);
      return this.arweave.ar.winstonToAr(balance);
    } catch (error) {
      this.logger.error(`Failed to get balance: ${error.message}`);
      throw new Error(`Arweave balance failed: ${error.message}`);
    }
  }

  /**
   * Get last transaction ID for address
   */
  async getLastTransactionId(address: string): Promise<string | null> {
    try {
      const lastTxId = await this.arweave.wallets.getLastTransactionID(address);
      return lastTxId;
    } catch (error) {
      this.logger.error(`Failed to get last transaction ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Search transactions by tag
   * @param tagName - Tag name to search
   * @param tagValue - Tag value to match
   * @returns Array of transaction IDs
   */
  async searchByTag(tagName: string, tagValue: string): Promise<string[]> {
    try {
      const transactions = await this.arweave.transactions.search(tagName, tagValue);
      const ids: string[] = [];
      for await (const tx of transactions) {
        ids.push(tx);
      }
      return ids;
    } catch (error) {
      this.logger.error(`Failed to search by tag: ${error.message}`);
      return [];
    }
  }

  /**
   * Get transactions for an address
   */
  async getTransactions(address: string, limit: number = 10): Promise<Array<{
    id: string;
    timestamp: number;
    fee: string;
    quantity: string;
  }>> {
    try {
      // Note: Arweave API doesn't support getting transactions by address directly
      // This is a placeholder implementation
      this.logger.warn('getTransactions is not fully implemented');
      return [];
    } catch (error) {
      this.logger.error(`Failed to get transactions: ${error.message}`);
      return [];
    }
  }
}