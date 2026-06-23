/**
 * 智能合约配置文件
 * 包含合约 ABI 和部署地址
 *
 * ⚠️ 重要安全提示:
 * - Sepolia 和 Base Sepolia 的合约地址当前为占位符
 * - 部署合约前请勿连接主网钱包进行交互
 * - 部署后请更新 CONTRACT_DEPLOYED 状态和 CONTRACT_ADDRESSES
 */

// AFC Token ABI (ERC20 + 治理 + 代币锁定)
export const AFC_TOKEN_ABI = [
  // ERC20 基础功能
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",

  // 治理功能
  "function propose(string description) returns (uint256)",
  "function cancel(uint256 proposalId)",
  "function execute(uint256 proposalId)",
  "function getProposal(uint256 proposalId) view returns (tuple(uint256 id, address proposer, string description, uint256 forVotes, uint256 againstVotes, bool executed, bool cancelled))",
  "event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description)",
  "event ProposalCancelled(uint256 indexed proposalId)",
  "event ProposalExecuted(uint256 indexed proposalId)",

  // 代币锁定功能
  "function lock(uint256 amount, uint256 unlockTime)",
  "function release()",
  "function lockedBalanceOf(address) view returns (uint256)",
  "event TokensLocked(address indexed user, uint256 amount, uint256 unlockTime)",
  "event TokensReleased(address indexed user, uint256 amount)",
] as const;

// Spark NFT ABI
export const SPARK_NFT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function mint(address to, string uri) returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Minted(address indexed to, uint256 indexed tokenId, string uri)",
] as const;

// 经济模型合约 ABI
export const ECONOMY_MODEL_ABI = [
  "function getPrice(address token) view returns (uint256)",
  "function getLiquidity(address token) view returns (uint256)",
  "function swap(address tokenIn, address tokenOut, uint256 amountIn) returns (uint256)",
  "function addLiquidity(address token, uint256 amount) returns (uint256)",
  "function removeLiquidity(address token, uint256 liquidity) returns (uint256)",
  "event Swapped(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)",
  "event LiquidityAdded(address indexed user, address token, uint256 amount, uint256 liquidity)",
  "event LiquidityRemoved(address indexed user, address token, uint256 liquidity, uint256 amount)",
] as const;

// 合约部署状态标记
// ⚠️ 部署合约后请更新为 true，并替换 CONTRACT_ADDRESSES 中的占位符地址
export const CONTRACT_DEPLOYED = {
  sepolia: false,           // Sepolia 测试网 - 未部署
  baseSepolia: true,        // Base Sepolia 测试网 - 已部署 (ap2-mvp-base)
  hardhat: true,            // Hardhat 本地开发 - 已部署（使用默认地址）
} as const;

// 占位符地址检测标记（用于开发阶段警告）
const PLACEHOLDER_ADDRESSES: `0x${string}`[] = [
  "0x1234567890123456789012345678901234567890",
  "0x2345678901234567890123456789012345678901",
  "0x3456789012345678901234567890123456789012",
  "0x4567890123456789012345678901234567890123",
  "0x5678901234567890123456789012345678901234",
  "0x6789012345678901234567890123456789012345",
];

function isPlaceholder(address: `0x${string}`): boolean {
  return PLACEHOLDER_ADDRESSES.includes(address);
}

// 合约部署地址（Sepolia 测试网）
// TODO: 部署合约后替换为真实地址
export const CONTRACT_ADDRESSES = {
  // Sepolia 测试网
  sepolia: {
    AFC_TOKEN: "0x1234567890123456789012345678901234567890" as `0x${string}`, // 替换为实际部署地址
    SPARK_NFT: "0x2345678901234567890123456789012345678901" as `0x${string}`, // 替换为实际部署地址
    ECONOMY_MODEL: "0x3456789012345678901234567890123456789012" as `0x${string}`, // 替换为实际部署地址
  },
  // Base Sepolia 测试网 (ap2-mvp-base 部署)
  baseSepolia: {
    ShadowAFC: "0x2dF7a295650e890fe2A48B3aa58BB38d36E89E42" as `0x${string}`,
    BudgetFence: "0xdb970DE65f90C9447a700C9b06ae6F591a9d9a55" as `0x${string}`,
    AP2Escrow: "0xFd553E5989834DF76f6C790021FDDBfEB9dc2972" as `0x${string}`,
    TDPO_Pool: "0x684FF81da3b9ac92D0f75037f7D3E6C7a792EC8f" as `0x${string}`,
    // 兼容旧字段
    AFC_TOKEN: "0x2dF7a295650e890fe2A48B3aa58BB38d36E89E42" as `0x${string}`,
    SPARK_NFT: "0xdb970DE65f90C9447a700C9b06ae6F591a9d9a55" as `0x${string}`,
    ECONOMY_MODEL: "0xFd553E5989834DF76f6C790021FDDBfEB9dc2972" as `0x${string}`,
  },
  // 本地开发
  hardhat: {
    AFC_TOKEN: "0x5FbDB2315678afecb367f032d93F642f64180aa3" as `0x${string}`, // Hardhat 默认第一个部署地址
    SPARK_NFT: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" as `0x${string}`, // Hardhat 默认第二个部署地址
    ECONOMY_MODEL: "0x9fE447828C8B91D6753697bF8d92825A0627545" as `0x${string}`, // Hardhat 默认第三个部署地址
  },
} as const;

// 获取当前网络的合约地址，返回类型严格为 `0x${string}`
export function getContractAddress(
  contractName: keyof typeof CONTRACT_ADDRESSES.sepolia,
  chainId?: number
): `0x${string}` {
  let address: `0x${string}`;
  let networkName: string;

  if (chainId === 11155111) {
    address = CONTRACT_ADDRESSES.sepolia[contractName];
    networkName = 'Sepolia';
  } else if (chainId === 84532) {
    address = CONTRACT_ADDRESSES.baseSepolia[contractName];
    networkName = 'Base Sepolia';
  } else if (chainId === 31337) {
    address = CONTRACT_ADDRESSES.hardhat[contractName];
    networkName = 'Hardhat Local';
  } else {
    // 默认返回 Sepolia
    address = CONTRACT_ADDRESSES.sepolia[contractName];
    networkName = `Unknown (chainId: ${chainId ?? 'undefined'})`;
  }

  // 开发环境警告：检测到占位符地址
  if (process.env.NODE_ENV === 'development' && isPlaceholder(address)) {
    console.warn(
      `⚠️ [net4.xyz] 合约 "${contractName}" 在 ${networkName} 网络上的地址为占位符（${address}）。\n` +
      `   请部署合约后更新 packages/frontend/src/config/contracts.ts 中的 CONTRACT_ADDRESSES。\n` +
      `   当前网络 chainId: ${chainId ?? 'undefined'}`
    );
  }

  return address;
}
