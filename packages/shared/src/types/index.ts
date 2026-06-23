// net4.xyz 共享类型定义

// 节点类型
export enum NodeType {
  CORE = 'core',       // 核心验证节点 (21个)
  SUB = 'sub',         // 子节点 (128个)
  NORMAL = 'normal',   // 普通节点
}

// 节点状态
export enum NodeStatus {
  ACTIVE = 'active',
  OFFLINE = 'offline',
  PUNISHING = 'punishing',
  PENDING = 'pending',
}

// 会员等级
export enum MemberLevel {
  NONE = 'none',
  BASIC = 'basic',     // 初级会员 $99/年
  MEDIUM = 'medium',   // 中级会员 $999/年
  ADVANCED = 'advanced', // 高级会员 $9999/年
}

// 任务状态
export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  VERIFIED = 'verified',
}

// AI 模型类型
export enum AIModelType {
  GPT_4O = 'gpt-4o',
  CLAUDE_35 = 'claude-3.5',
  LLAMA_3_70B = 'llama-3-70b',
  LLAMA_3_405B = 'llama-3-405b',
  MIXTRAL_8X22B = 'mixtral-8x22b',
}

// 域名解析类型
export enum DNSRecordType {
  WALLET = 'wallet',
  IPFS = 'ipfs',
  DID = 'did',
}

// 交易类型
export enum TransactionType {
  TRANSFER = 'transfer',
  STAKE = 'stake',
  UNSTAKE = 'unstake',
  REWARD = 'reward',
  BURN = 'burn',
  FEE = 'fee',
}

// 基础接口
export interface IBaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// 用户接口
export interface IUser extends IBaseEntity {
  address: string;
  email?: string;
  twitter?: string;
  memberLevel: MemberLevel;
  memberExpiry?: Date;
  nodeId?: string;
}

// 节点接口
export interface INode extends IBaseEntity {
  owner: string;
  nodeType: NodeType;
  status: NodeStatus;
  aiModelType: AIModelType;
  reputation: number;
  stakedAmount: bigint;
  region?: string;
  lastActiveAt?: Date;
}

// AI 任务接口
export interface IAITask extends IBaseEntity {
  nodeId: string;
  taskHash: string;
  prompt: string;
  result?: string;
  status: TaskStatus;
  reward: bigint;
  zkProof?: string;
  verifiedAt?: Date;
}

// 域名接口
export interface IDomain extends IBaseEntity {
  name: string; // 不包含 .web4 后缀
  owner: string;
  recordType: DNSRecordType;
  recordValue: string;
  expiryDate: Date;
  price: bigint;
}

// 交易接口
export interface ITransaction extends IBaseEntity {
  hash: string;
  from: string;
  to: string;
  amount: bigint;
  type: TransactionType;
  blockNumber: number;
  timestamp: Date;
}

// 内容接口
export interface IContent extends IBaseEntity {
  author: string;
  title: string;
  content: string;
  ipfsHash: string;
  chainHash: string;
  isPremium: boolean;
  price?: bigint;
}

// API 响应类型
export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 分页类型
export interface IPaginationParams {
  page: number;
  limit: number;
}

export interface IPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}