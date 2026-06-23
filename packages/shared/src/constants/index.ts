// net4.xyz 共享常量定义

// 链配置
export const CHAIN_CONFIG = {
  // Base Sepolia 测试网
  baseSepolia: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
  },
  // Base 主网
  base: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
  },
  // AFC 主网（待部署）
  afc: {
    chainId: 0, // 待定
    name: 'AFC',
    rpcUrl: process.env.NEXT_PUBLIC_AFC_RPC_URL || '',
    blockExplorer: '',
  },
} as const;

// 合约地址（测试网）
export const CONTRACT_ADDRESSES = {
  // Base Sepolia
  baseSepolia: {
    afcToken: process.env.NEXT_PUBLIC_AFC_TOKEN_SEPOLIA || '',
    sparkNFT: process.env.NEXT_PUBLIC_SPARK_NFT_SEPOLIA || '',
    pueConsensus: process.env.NEXT_PUBLIC_PUE_CONSENSUS_SEPOLIA || '',
    nodeRegistry: process.env.NEXT_PUBLIC_NODE_REGISTRY_SEPOLIA || '',
    web4DNS: process.env.NEXT_PUBLIC_WEB4_DNS_SEPOLIA || '',
    mirromeSocial: process.env.NEXT_PUBLIC_MIRROME_SOCIAL_SEPOLIA || '',
  },
  // Base 主网
  base: {
    afcToken: process.env.NEXT_PUBLIC_AFC_TOKEN_BASE || '',
    sparkNFT: process.env.NEXT_PUBLIC_SPARK_NFT_BASE || '',
    pueConsensus: process.env.NEXT_PUBLIC_PUE_CONSENSUS_BASE || '',
    nodeRegistry: process.env.NEXT_PUBLIC_NODE_REGISTRY_BASE || '',
    web4DNS: process.env.NEXT_PUBLIC_WEB4_DNS_BASE || '',
    mirromeSocial: process.env.NEXT_PUBLIC_MIRROME_SOCIAL_BASE || '',
  },
} as const;

// 节点配置
export const NODE_CONFIG = {
  // 核心验证节点
  core: {
    maxCount: 21,
    minStake: 100000n, // 10万 USDT
    hardware: {
      gpu: 'H100/A100',
      cpu: '32 核',
      memory: '256GB',
      storage: '1TB SSD',
    },
  },
  // 子节点
  sub: {
    maxCount: 128,
    minStake: 9999n, // $9,999
    hardware: {
      gpu: 'RTX 4090/3090',
      cpu: '16 核',
      memory: '128GB',
      storage: '512GB SSD',
    },
  },
  // 普通节点
  normal: {
    maxCount: 10000,
    minStake: 9999n, // 1个火种 NFT
    hardware: {
      gpu: '无要求/API',
      cpu: '无要求',
      memory: '无要求',
      storage: '无要求',
    },
  },
} as const;

// 会员配置
export const MEMBER_CONFIG = {
  basic: {
    price: 99, // USDT/年
    features: [
      '基础内容访问（Wiki/Blog/白皮书）',
      '视频/播客免费观看',
      'TG 订阅频道权限',
      '书籍发布权限',
    ],
  },
  medium: {
    price: 999, // USDT/年
    features: [
      '高级内容（AFC 代码区/创始成员深度访谈）',
      '播客投稿权限',
      '社区提案投票权',
      '初级会员全部权益',
    ],
  },
  advanced: {
    price: 9999, // USDT/年
    features: [
      '火种节点候选资格',
      '核心治理投票权',
      '线下峰会邀请',
      'Mirrome 内测权限',
      '中级会员全部权益',
    ],
  },
} as const;

// AI 模型配置
export const AI_MODEL_CONFIG = {
  // 轨道 A：云端 API
  cloud: {
    'gpt-4o': {
      provider: 'OpenAI',
      maxTokens: 128000,
      costPer1kTokens: 0.01,
    },
    'claude-3.5': {
      provider: 'Anthropic',
      maxTokens: 200000,
      costPer1kTokens: 0.015,
    },
  },
  // 轨道 B：本地部署
  local: {
    'llama-3-70b': {
      provider: 'Meta',
      hardware: 'H100/A100',
      vram: '140GB',
    },
    'llama-3-405b': {
      provider: 'Meta',
      hardware: 'H100 x8',
      vram: '810GB',
    },
    'mixtral-8x22b': {
      hardware: 'RTX 4090',
      vram: '48GB',
    },
  },
} as const;

// UI 配置
export const UI_CONFIG = {
  colors: {
    primary: {
      dark: '#0A0A0A',    // 深空黑
      brand: '#B026FF',   // 全息紫
    },
    secondary: {
      electric: '#00FFFF', // 电光蓝
      gold: '#FFD700',     // 金色
      orange: '#FAAD14',   // 橙色
      green: '#52C41A',    // 绿色
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#8C8C8C',
    },
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// API 配置
export const API_CONFIG = {
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
} as const;

// 存储配置
export const STORAGE_CONFIG = {
  ipfs: {
    gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
    pinningService: process.env.IPFS_PINNING_SERVICE || '',
  },
  arweave: {
    gateway: 'https://arweave.net/',
    wallet: process.env.ARWEAVE_WALLET || '',
  },
} as const;