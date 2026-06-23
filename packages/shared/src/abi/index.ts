// net4.xyz 智能合约 ABI 封装
// 基于已部署的合约自动生成类型安全的 ABI 封装

import { ethers } from 'ethers';

// ==================== ERC20 ABI ====================
export const ERC20_ABI = [
  // Read-only
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  // Write
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
] as const;

// ==================== ERC721 ABI ====================
export const ERC721_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function approve(address to, uint256 tokenId) external",
  "function setApprovalForAll(address operator, bool approved) external",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function safeTransferFrom(address from, address to, uint256 tokenId) external",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)",
] as const;

// ==================== ERC1155 ABI ====================
export const ERC1155_ABI = [
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])",
  "function setApprovalForAll(address operator, bool approved) external",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data) external",
  "function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data) external",
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
  "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)",
  "event ApprovalForAll(address indexed account, address indexed operator, bool approved)",
  "event URI(string value, uint256 indexed id)",
] as const;

// ==================== AFC Token ABI ====================
export const AFC_TOKEN_ABI = [
  ...ERC20_ABI,
  "function lockedBalances(address user) view returns (uint256)",
  "function lockEndTimes(address user) view returns (uint256)",
  "function lockTokens(address user, uint256 amount, uint256 duration) external",
  "function unlockTokens(address user) external",
  "function burn(uint256 amount) external",
  "event TokensLocked(address indexed user, uint256 amount, uint256 unlockTime)",
  "event TokensUnlocked(address indexed user, uint256 amount)",
] as const;

// ==================== Spark NFT ABI ====================
export const SPARK_NFT_ABI = [
  ...ERC721_ABI,
  "function mint(address to, uint256 nodeType) external returns (uint256)",
  "function burn(uint256 tokenId) external",
  "function getNodeInfo(uint256 tokenId) view returns (tuple(uint256 nodeType, uint256 power, uint256 stakedAmount, address owner))",
  "function stake(uint256 tokenId) external",
  "function unstake(uint256 tokenId) external",
  "function getStakeInfo(uint256 tokenId) view returns (bool isStaked, uint256 stakedAt)",
  "event NodeMinted(address indexed to, uint256 indexed tokenId, uint256 nodeType)",
  "event NodeStaked(address indexed owner, uint256 indexed tokenId)",
  "event NodeUnstaked(address indexed owner, uint256 indexed tokenId)",
] as const;

// ==================== PoUE Consensus ABI ====================
export const PUE_CONSENSUS_ABI = [
  "function submitTask(bytes32 taskHash, string prompt) external returns (bytes32)",
  "function submitResult(bytes32 taskId, string result, bytes zkProof) external",
  "function verifyResult(bytes32 taskId) external view returns (bool)",
  "function getTask(bytes32 taskId) view returns (tuple(address node, string prompt, string result, uint8 status, uint256 reward, uint256 submittedAt, uint256 verifiedAt))",
  "function getNodeTasks(address node) view returns (bytes32[])",
  "function getPendingTasks() view returns (bytes32[])",
  "function calculateReward(bytes32 taskId) external view returns (uint256)",
  "event TaskSubmitted(bytes32 indexed taskId, address indexed node, string prompt)",
  "event ResultSubmitted(bytes32 indexed taskId, address indexed node, string result)",
  "event ResultVerified(bytes32 indexed taskId, bool success)",
  "event RewardDistributed(bytes32 indexed taskId, address indexed node, uint256 amount)",
] as const;

// ==================== Node Registry ABI ====================
export const NODE_REGISTRY_ABI = [
  "function registerNode(uint256 nodeType, string metadata) external returns (uint256 nodeId)",
  "function updateNodeStatus(uint256 nodeId, uint8 status) external",
  "function slashNode(uint256 nodeId, uint256 penalty) external",
  "function getNode(uint256 nodeId) view returns (tuple(address owner, uint256 nodeType, uint8 status, uint256 reputation, uint256 stakedAmount, string metadata))",
  "function getNodesByOwner(address owner) view returns (uint256[])",
  "function getActiveNodes() view returns (uint256[])",
  "function getNodeCount() view returns (uint256)",
  "event NodeRegistered(uint256 indexed nodeId, address indexed owner, uint256 nodeType)",
  "event NodeStatusUpdated(uint256 indexed nodeId, uint8 status)",
  "event NodeSlashed(uint256 indexed nodeId, uint256 penalty)",
] as const;

// ==================== Web4 DNS ABI ====================
export const WEB4_DNS_ABI = [
  "function register(string name, address owner, uint256 duration) external returns (uint256)",
  "function renew(string name, uint256 duration) external",
  "function setRecord(string name, uint8 recordType, string recordValue) external",
  "function getRecord(string name) view returns (tuple(address owner, uint8 recordType, string recordValue, uint256 expiryDate))",
  "function resolve(string name) view returns (string)",
  "function getPrice(string name, uint256 duration) view returns (uint256)",
  "function transfer(string name, address newOwner) external",
  "event DomainRegistered(string indexed name, address indexed owner, uint256 expiryDate)",
  "event DomainRenewed(string indexed name, uint256 newExpiryDate)",
  "event RecordUpdated(string indexed name, uint8 recordType, string recordValue)",
  "event DomainTransferred(string indexed name, address indexed from, address indexed to)",
] as const;

// ==================== Mirrome Social ABI ====================
export const MIRROME_SOCIAL_ABI = [
  "function createPost(string content, string ipfsHash) external returns (uint256)",
  "function createPost(string content, string ipfsHash, uint256 price) external returns (uint256)",
  "function deletePost(uint256 postId) external",
  "function tipPost(uint256 postId) external payable",
  "function getPost(uint256 postId) view returns (tuple(address author, string content, string ipfsHash, uint256 likes, uint256 tips, uint256 createdAt))",
  "function getPostsByAuthor(address author) view returns (uint256[])",
  "function likePost(uint256 postId) external",
  "function reportPost(uint256 postId, string reason) external",
  "event PostCreated(uint256 indexed postId, address indexed author, string ipfsHash)",
  "event PostDeleted(uint256 indexed postId)",
  "event PostLiked(uint256 indexed postId, address indexed liker)",
  "event PostTipped(uint256 indexed postId, address indexed tipper, uint256 amount)",
  "event PostReported(uint256 indexed postId, address indexed reporter, string reason)",
] as const;

// ==================== Contract Factory Functions ====================

/**
 * 创建 ERC20 合约实例
 */
export function createERC20Contract(
  address: string,
  provider: ethers.Provider | ethers.Signer
): ethers.Contract {
  return new ethers.Contract(address, ERC20_ABI, provider);
}

/**
 * 创建 AFC Token 合约实例
 */
export function createAFCTokenContract(
  address: string,
  provider: ethers.Provider | ethers.Signer
): ethers.Contract {
  return new ethers.Contract(address, AFC_TOKEN_ABI, provider);
}

/**
 * 创建 Spark NFT 合约实例
 */
export function createSparkNFTContract(
  address: string,
  provider: ethers.Provider | ethers.Signer
): ethers.Contract {
  return new ethers.Contract(address, SPARK_NFT_ABI, provider);
}

/**
 * 创建 PoUE Consensus 合约实例
 */
export function createPUEConsensusContract(
  address: string,
  provider: ethers.Provider | ethers.Signer
): ethers.Contract {
  return new ethers.Contract(address, PUE_CONSENSUS_ABI, provider);
}

/**
 * 创建 Node Registry 合约实例
 */
export function createNodeRegistryContract(
  address: string,
  provider: ethers.Provider | ethers.Signer
): ethers.Contract {
  return new ethers.Contract(address, NODE_REGISTRY_ABI, provider);
}

/**
 * 创建 Web4 DNS 合约实例
 */
export function createWeb4DNSContract(
  address: string,
  provider: ethers.Provider | ethers.Signer
): ethers.Contract {
  return new ethers.Contract(address, WEB4_DNS_ABI, provider);
}

/**
 * 创建 Mirrome Social 合约实例
 */
export function createMirromeSocialContract(
  address: string,
  provider: ethers.Provider | ethers.Signer
): ethers.Contract {
  return new ethers.Contract(address, MIRROME_SOCIAL_ABI, provider);
}

// ==================== ABI Type Exports ====================
export type ERC20ABI = typeof ERC20_ABI;
export type ERC721ABI = typeof ERC721_ABI;
export type ERC1155ABI = typeof ERC1155_ABI;
export type AFCTokenABI = typeof AFC_TOKEN_ABI;
export type SparkNFTABI = typeof SPARK_NFT_ABI;
export type PUEConsensusABI = typeof PUE_CONSENSUS_ABI;
export type NodeRegistryABI = typeof NODE_REGISTRY_ABI;
export type Web4DNSABI = typeof WEB4_DNS_ABI;
export type MirromeSocialABI = typeof MIRROME_SOCIAL_ABI;