// net4.xyz 统一配置管理
// 支持环境变量、运行时配置和默认值

import { CHAIN_CONFIG, CONTRACT_ADDRESSES, NODE_CONFIG, MEMBER_CONFIG, AI_MODEL_CONFIG, UI_CONFIG, API_CONFIG, STORAGE_CONFIG } from '../constants';

// ==================== 配置类型 ====================

export interface RuntimeConfig {
  env: 'development' | 'testnet' | 'mainnet';
  chain: typeof CHAIN_CONFIG.baseSepolia | typeof CHAIN_CONFIG.base;
  contracts: typeof CONTRACT_ADDRESSES.baseSepolia | typeof CONTRACT_ADDRESSES.base;
  node: typeof NODE_CONFIG;
  member: typeof MEMBER_CONFIG;
  aiModel: typeof AI_MODEL_CONFIG;
  ui: typeof UI_CONFIG;
  api: typeof API_CONFIG;
  storage: typeof STORAGE_CONFIG;
}

// ==================== 配置获取器 ====================

class ConfigManager {
  private _config: RuntimeConfig | null = null;

  /**
   * 获取当前环境
   */
  get env(): 'development' | 'testnet' | 'mainnet' {
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') {
      return process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
    }
    return 'development';
  }

  /**
   * 获取完整运行时配置
   */
  get config(): RuntimeConfig {
    if (this._config) {
      return this._config;
    }

    const isMainnet = this.env === 'mainnet';
    const chainConfig = isMainnet ? CHAIN_CONFIG.base : CHAIN_CONFIG.baseSepolia;
    const contractAddresses = isMainnet ? CONTRACT_ADDRESSES.base : CONTRACT_ADDRESSES.baseSepolia;

    this._config = {
      env: this.env,
      chain: chainConfig,
      contracts: contractAddresses,
      node: NODE_CONFIG,
      member: MEMBER_CONFIG,
      aiModel: AI_MODEL_CONFIG,
      ui: UI_CONFIG,
      api: API_CONFIG,
      storage: STORAGE_CONFIG,
    };

    return this._config;
  }

  /**
   * 获取链配置
   */
  get chain() {
    return this.config.chain;
  }

  /**
   * 获取合约地址
   */
  get contracts() {
    return this.config.contracts;
  }

  /**
   * 获取节点配置
   */
  get node() {
    return this.config.node;
  }

  /**
   * 获取会员配置
   */
  get member() {
    return this.config.member;
  }

  /**
   * 获取 AI 模型配置
   */
  get aiModel() {
    return this.config.aiModel;
  }

  /**
   * 获取 UI 配置
   */
  get ui() {
    return this.config.ui;
  }

  /**
   * 获取 API 配置
   */
  get api() {
    return this.config.api;
  }

  /**
   * 获取存储配置
   */
  get storage() {
    return this.config.storage;
  }

  /**
   * 获取特定合约地址
   */
  getContractAddress<K extends keyof typeof CONTRACT_ADDRESSES.base>(
    contractName: K
  ): string {
    const isMainnet = this.env === 'mainnet';
    const addresses = isMainnet ? CONTRACT_ADDRESSES.base : CONTRACT_ADDRESSES.baseSepolia;
    return addresses[contractName];
  }

  /**
   * 检查合约是否已部署
   */
  isContractDeployed(contractName: keyof typeof CONTRACT_ADDRESSES.base): boolean {
    const address = this.getContractAddress(contractName);
    return !!address && address !== '';
  }

  /**
   * 获取 RPC URL
   */
  get rpcUrl(): string {
    return this.chain.rpcUrl;
  }

  /**
   * 获取区块浏览器 URL
   */
  get blockExplorer(): string {
    return this.chain.blockExplorer;
  }

  /**
   * 获取链 ID
   */
  get chainId(): number {
    return this.chain.chainId;
  }

  /**
   * 重新加载配置（用于开发环境热重载）
   */
  reload(): void {
    this._config = null;
  }
}

// 导出单例
export const config = new ConfigManager();

// 导出便捷函数
export const getConfig = () => config.config;
export const getChainConfig = () => config.chain;
export const getContractAddresses = () => config.contracts;
export const isMainnet = () => config.env === 'mainnet';
export const isTestnet = () => config.env === 'testnet';
export const isDevelopment = () => config.env === 'development';