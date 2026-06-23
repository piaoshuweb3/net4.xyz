import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, Contract } from 'ethers';
import { PrismaService } from '../common/services/prisma.service';

// 合约 ABI（简化版，实际项目中需要完整的 ABI）
const AFC_TOKEN_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

const SPARK_NFT_ABI = [
  'function mint(address to, uint256 nodeType) returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function getNodeInfo(uint256 tokenId) view returns (tuple(uint256 nodeType, uint256 reputation, uint256 stakedAmount))',
  'function stake(uint256 tokenId) returns (bool)',
  'function unstake(uint256 tokenId) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Staked(address indexed owner, uint256 indexed tokenId)',
  'event Unstaked(address indexed owner, uint256 indexed tokenId)',
];

const PUE_CONSENSUS_ABI = [
  'function submitWorkProof(uint256 nodeId, bytes32 taskHash, bytes memory aiResult, bytes memory zkProof) returns (bool)',
  'function assignTask(uint256 nodeId) returns (bytes32)',
  'function getTask(bytes32 taskHash) view returns (tuple(bytes32 hash, string prompt, uint256 reward, address assignedNode))',
  'function verifyProof(bytes32 taskHash, bytes memory zkProof) view returns (bool)',
  'event TaskAssigned(bytes32 indexed taskHash, uint256 indexed nodeId, string prompt)',
  'event WorkSubmitted(bytes32 indexed taskHash, uint256 indexed nodeId, uint256 reward)',
];

@Injectable()
export class BlockchainService implements OnModuleInit, OnModuleDestroy {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | ethers.HDNodeWallet;
  private afcToken: Contract;
  private sparkNft: Contract;
  private pueConsensus: Contract;
  private eventListeners: Map<string, ethers.Contract> = new Map();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const rpcUrl = this.configService.get('BLOCKCHAIN_RPC_URL', 'https://sepolia.base.org');
    const privateKey = this.configService.get('PRIVATE_KEY', '');

    // net4.xyz: 使用 FetchRequest 设置超时，避免 JsonRpcProvider 无限重试
    const fetchRequest = new ethers.FetchRequest(rpcUrl);
    fetchRequest.timeout = 5000; // 5秒超时
    this.provider = new ethers.JsonRpcProvider(fetchRequest, undefined, { staticNetwork: true });

    // net4.xyz: 如果私钥为空，使用随机生成的临时钱包（仅用于开发/演示模式）
    if (!privateKey || privateKey.length < 64) {
      Logger.warn('区块链私钥未配置或无效，使用临时随机钱包（仅开发模式）');
      this.wallet = ethers.Wallet.createRandom().connect(this.provider);
    } else {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
    }

    // 初始化合约
    const afcTokenAddress = this.configService.get('AFC_TOKEN_ADDRESS', '');
    const sparkNftAddress = this.configService.get('SPARK_NFT_ADDRESS', '');
    const pueConsensusAddress = this.configService.get('PUE_CONSENSUS_ADDRESS', '');

    // net4.xyz: 如果合约地址为空，使用零地址（仅用于开发/演示模式，避免启动崩溃）
    const validAfcTokenAddress = afcTokenAddress || ethers.ZeroAddress;
    const validSparkNftAddress = sparkNftAddress || ethers.ZeroAddress;
    const validPueConsensusAddress = pueConsensusAddress || ethers.ZeroAddress;

    if (!afcTokenAddress || !sparkNftAddress || !pueConsensusAddress) {
      Logger.warn('部分合约地址未配置，使用零地址占位（仅开发模式）');
    }

    this.afcToken = new Contract(validAfcTokenAddress, AFC_TOKEN_ABI, this.wallet);
    this.sparkNft = new Contract(validSparkNftAddress, SPARK_NFT_ABI, this.wallet);
    this.pueConsensus = new Contract(validPueConsensusAddress, PUE_CONSENSUS_ABI, this.wallet);
  }

  async onModuleInit() {
    // 启动事件监听
    await this.startEventListeners();
  }

  async onModuleDestroy() {
    // 停止事件监听
    this.eventListeners.forEach((contract, eventName) => {
      contract.removeAllListeners(eventName);
    });
  }

  // ==================== 合约调用 ====================

  /**
   * 获取代币余额
   */
  async getBalance(address: string): Promise<string> {
    const balance = await this.afcToken.balanceOf(address);
    return balance.toString();
  }

  /**
   * 转账代币
   */
  async transfer(to: string, amount: string): Promise<string> {
    const tx = await this.afcToken.transfer(to, amount);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * 批准代币转账
   */
  async approve(spender: string, amount: string): Promise<string> {
    const tx = await this.afcToken.approve(spender, amount);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * 质押 NFT
   */
  async stakeNft(tokenId: number): Promise<string> {
    const tx = await this.sparkNft.stake(tokenId);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * 解除 NFT 质押
   */
  async unstakeNft(tokenId: number): Promise<string> {
    const tx = await this.sparkNft.unstake(tokenId);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * 获取 NFT 节点信息
   */
  async getNodeInfo(tokenId: number): Promise<any> {
    return this.sparkNft.getNodeInfo(tokenId);
  }

  /**
   * 提交 AI 工作证明
   */
  async submitWorkProof(
    nodeId: number,
    taskHash: string,
    aiResult: string,
    zkProof: string,
  ): Promise<string> {
    const tx = await this.pueConsensus.submitWorkProof(nodeId, taskHash, aiResult, zkProof);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * 分配 AI 任务
   */
  async assignTask(nodeId: number): Promise<string> {
    const tx = await this.pueConsensus.assignTask(nodeId);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * 获取任务详情
   */
  async getTask(taskHash: string): Promise<any> {
    return this.pueConsensus.getTask(taskHash);
  }

  // ==================== 交易管理 ====================

  /**
   * 发送交易
   */
  async sendTransaction(to: string, value: string, data: string = '0x'): Promise<string> {
    const tx = {
      to,
      value: ethers.parseEther(value),
      data,
    };

    const response = await this.wallet.sendTransaction(tx);
    return response.hash;
  }

  /**
   * 获取交易收据
   */
  async getTransactionReceipt(hash: string) {
    return this.provider.getTransactionReceipt(hash);
  }

  /**
   * 获取交易详情
   */
  async getTransaction(hash: string) {
    return this.provider.getTransaction(hash);
  }

  /**
   * 估算 Gas 费用
   */
  async estimateGas(to: string, value: string, data: string = '0x'): Promise<string> {
    const tx = {
      to,
      value: ethers.parseEther(value),
      data,
    };

    const estimate = await this.provider.estimateGas(tx);
    return estimate.toString();
  }

  /**
   * 获取当前 Gas 价格
   */
  async getGasPrice(): Promise<string> {
    const feeData = await this.provider.getFeeData();
    return feeData.gasPrice?.toString() || '0';
  }

  // ==================== 事件监听 ====================

  /**
   * 启动事件监听
   */
  private async startEventListeners() {
    // 监听代币转账事件
    this.afcToken.on('Transfer', async (from, to, amount, event) => {
      await this.handleTransferEvent(from, to, amount, event);
    });

    // 监听 NFT 质押事件
    this.sparkNft.on('Staked', async (owner, tokenId, event) => {
      await this.handleStakedEvent(owner, tokenId, event);
    });

    this.sparkNft.on('Unstaked', async (owner, tokenId, event) => {
      await this.handleUnstakedEvent(owner, tokenId, event);
    });

    // 监听任务分配事件
    this.pueConsensus.on('TaskAssigned', async (taskHash, nodeId, prompt, event) => {
      await this.handleTaskAssignedEvent(taskHash, nodeId, prompt, event);
    });

    // 监听工作提交事件
    this.pueConsensus.on('WorkSubmitted', async (taskHash, nodeId, reward, event) => {
      await this.handleWorkSubmittedEvent(taskHash, nodeId, reward, event);
    });
  }

  /**
   * 处理代币转账事件
   */
  private async handleTransferEvent(from: string, to: string, amount: bigint, event: any) {
    // 记录交易到数据库
    await (this.prisma as any).transaction.upsert({
      where: { hash: event.transactionHash || '' },
      create: {
        hash: event.transactionHash || '',
        from,
        to,
        amount: parseFloat(ethers.formatEther(amount)),
        token: 'AFC',
        type: 'TRANSFER',
        status: 'CONFIRMED',
        blockNumber: event.blockNumber,
      },
      update: {
        status: 'CONFIRMED',
      },
    });
  }

  /**
   * 处理质押事件
   */
  private async handleStakedEvent(owner: string, tokenId: bigint, event: any) {
    // 更新节点状态
    const node = await (this.prisma as any).node.findFirst({
      where: { owner: { address: owner.toLowerCase() } },
    });

    if (node) {
      await (this.prisma as any).node.update({
        where: { id: node.id },
        data: { status: 'ACTIVE' },
      });
    }
  }

  /**
   * 处理解除质押事件
   */
  private async handleUnstakedEvent(owner: string, tokenId: bigint, event: any) {
    const node = await (this.prisma as any).node.findFirst({
      where: { owner: { address: owner.toLowerCase() } },
    });

    if (node) {
      await (this.prisma as any).node.update({
        where: { id: node.id },
        data: { status: 'OFFLINE' },
      });
    }
  }

  /**
   * 处理任务分配事件
   */
  private async handleTaskAssignedEvent(taskHash: string, nodeId: bigint, prompt: string, event: any) {
    await (this.prisma as any).aITask.create({
      data: {
        nodeId: nodeId.toString(),
        taskHash,
        prompt,
        status: 'PENDING',
        startedAt: new Date(),
      },
    });
  }

  /**
   * 处理工作提交事件
   */
  private async handleWorkSubmittedEvent(taskHash: string, nodeId: bigint, reward: bigint, event: any) {
    await (this.prisma as any).aITask.updateMany({
      where: { taskHash },
      data: {
        status: 'VERIFIED',
        reward: parseFloat(ethers.formatEther(reward)),
        verifiedAt: new Date(),
      },
    });
  }

  // ==================== 链上数据同步 ====================

  /**
   * 同步节点数据
   */
  async syncNodeData(tokenId: number) {
    const nodeInfo = await this.getNodeInfo(tokenId);

    // 更新数据库中的节点信息
    await (this.prisma as any).node.updateMany({
      where: { id: tokenId.toString() },
      data: {
        reputation: Number(nodeInfo.reputation),
        stakedAmount: parseFloat(ethers.formatEther(nodeInfo.stakedAmount)),
      },
    });

    return nodeInfo;
  }

  /**
   * 同步任务数据
   */
  async syncTaskData(taskHash: string) {
    const task = await this.getTask(taskHash);

    await (this.prisma as any).aITask.upsert({
      where: { taskHash },
      create: {
        taskHash,
        prompt: task.prompt,
        reward: parseFloat(ethers.formatEther(task.reward)),
        status: 'PENDING',
      },
      update: {
        reward: parseFloat(ethers.formatEther(task.reward)),
      },
    });

    return task;
  }

  // ==================== 工具函数 ====================

  /**
   * 获取钱包地址
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * 获取当前区块高度
   */
  async getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  /**
   * 获取区块信息
   */
  async getBlock(blockNumber: number) {
    return this.provider.getBlock(blockNumber);
  }
}