import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { NodeStatus, TaskStatus } from '@prisma/client';
import { 
  GenerateProofInput, 
  VerifyProofInput, 
  SubmitWorkProofInput,
  EmotionalConsensusInput,
  AntiCheatCheckInput 
} from './dto/zkml.input';
import * as crypto from 'crypto';

/**
 * ZK-ML Verification Service
 * PoUE 共识机制核心组件 - 零知识机器学习验证
 */
@Injectable()
export class ZKMLService {
  private readonly logger = new Logger(ZKMLService.name);
  
  // 统计信息
  private stats = {
    totalProofsGenerated: 0,
    totalProofsVerified: 0,
    successfulVerifications: 0,
    totalProofTime: 0,
    cheatingAttemptsDetected: 0,
  };

  // 情感分析缓存
  private emotionCache = new Map<string, any>();
  
  // 节点历史结果缓存（用于作弊检测）
  private nodeResultHistory = new Map<string, string[]>();

  constructor(private prisma: PrismaService) {}

  /**
   * 生成 ZK 证明
   * 节点完成 AI 任务后，生成零知识证明证明任务确实被执行
   */
  async generateProof(input: GenerateProofInput): Promise<{
    taskId: string;
    proof: string;
    publicSignals: string;
    proofHash: string;
    generationTime: number;
  }> {
    const startTime = Date.now();
    
    // 验证任务存在且状态正确
    const task = await this.prisma.aITask.findUnique({
      where: { id: input.taskId },
    });

    if (!task) {
      throw new BadRequestException('Task not found');
    }

    if (task.status !== TaskStatus.PENDING && task.status !== TaskStatus.PROCESSING) {
      throw new BadRequestException('Task is not in valid state for proof generation');
    }

    // 生成输入哈希
    const inputHash = input.inputHash || this.generateHash(input.prompt + input.aiResult);
    
    // 生成模型哈希
    const modelHash = input.modelHash;

    // 生成 ZK 证明（模拟实现）
    // 在实际实现中，这里会调用 snarkjs 或其他 ZK 库
    const proof = await this.generateZKProof({
      inputHash,
      modelHash,
      prompt: input.prompt,
      result: input.aiResult,
    });

    // 生成公开信号
    const publicSignals = this.generatePublicSignals({
      taskId: input.taskId,
      inputHash,
      modelHash,
      timestamp: Date.now(),
    });

    // 计算证明哈希
    const proofHash = this.generateHash(proof);

    // 更新任务状态
    await this.prisma.aITask.update({
      where: { id: input.taskId },
      data: {
        status: TaskStatus.COMPLETED,
        result: input.aiResult,
        zkProof: proof,
        completedAt: new Date(),
      },
    });

    // 更新统计
    const generationTime = Date.now() - startTime;
    this.stats.totalProofsGenerated++;
    this.stats.totalProofTime += generationTime;

    this.logger.log(`ZK proof generated for task ${input.taskId} in ${generationTime}ms`);

    return {
      taskId: input.taskId,
      proof,
      publicSignals,
      proofHash,
      generationTime,
    };
  }

  /**
   * 验证 ZK 证明
   * 验证节点提交的零知识证明是否有效
   */
  async verifyProof(input: VerifyProofInput): Promise<{
    isValid: boolean;
    message: string;
    confidence?: number;
    errorCode?: string;
  }> {
    const startTime = Date.now();
    
    // 验证任务存在
    const task = await this.prisma.aITask.findUnique({
      where: { id: input.taskId },
    });

    if (!task) {
      return {
        isValid: false,
        message: 'Task not found',
        errorCode: 'TASK_NOT_FOUND',
      };
    }

    // 验证证明格式
    if (!this.validateProofFormat(input.proof)) {
      this.stats.cheatingAttemptsDetected++;
      return {
        isValid: false,
        message: 'Invalid proof format',
        errorCode: 'INVALID_PROOF_FORMAT',
      };
    }

    // 验证证明内容
    const isValid = await this.verifyZKProof(input.proof, input.aiResult, input.publicSignals);
    
    this.stats.totalProofsVerified++;

    if (isValid) {
      this.stats.successfulVerifications++;
      
      // 更新任务状态为已验证
      await this.prisma.aITask.update({
        where: { id: input.taskId },
        data: {
          status: TaskStatus.VERIFIED,
          verifiedAt: new Date(),
        },
      });

      const verificationTime = Date.now() - startTime;
      this.logger.log(`ZK proof verified for task ${input.taskId} in ${verificationTime}ms`);

      return {
        isValid: true,
        message: 'Proof verified successfully',
        confidence: 0.99,
      };
    } else {
      this.stats.cheatingAttemptsDetected++;
      return {
        isValid: false,
        message: 'Proof verification failed',
        errorCode: 'PROOF_VERIFICATION_FAILED',
      };
    }
  }

  /**
   * 提交工作证明
   * 节点提交 AI 工作结果和 ZK 证明
   */
  async submitWorkProof(input: SubmitWorkProofInput): Promise<{
    success: boolean;
    message: string;
    reward?: number;
    newReputation?: number;
  }> {
    // 验证节点是否活跃
    const node = await this.prisma.node.findUnique({
      where: { id: input.nodeId },
    });

    if (!node) {
      return {
        success: false,
        message: 'Node not found',
      };
    }

    if (node.status !== NodeStatus.ACTIVE) {
      return {
        success: false,
        message: 'Node is not active',
      };
    }

    // 验证任务哈希
    const task = await this.prisma.aITask.findFirst({
      where: { 
        nodeId: input.nodeId,
        taskHash: input.taskHash,
        status: { in: [TaskStatus.PENDING, TaskStatus.PROCESSING] },
      },
    });

    if (!task) {
      return {
        success: false,
        message: 'Task not found or already completed',
      };
    }

    // 验证 ZK 证明
    const verificationResult = await this.verifyProof({
      taskId: task.id,
      proof: input.zkProof,
      aiResult: input.aiResult,
      publicSignals: '',
    });

    if (!verificationResult.isValid) {
      // 触发惩罚
      await this.punishNode(input.nodeId, 'CHEATING', 'Invalid ZK proof');
      
      return {
        success: false,
        message: verificationResult.message,
      };
    }

    // 计算奖励
    const reward = this.calculateReward(node.nodeType);
    
    // 更新节点信誉
    const newReputation = node.reputation + 10;

    // 更新节点和任务
    await this.prisma.$transaction([
      this.prisma.aITask.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.VERIFIED,
          result: input.aiResult,
          zkProof: input.zkProof,
          reward,
          verifiedAt: new Date(),
          completedAt: new Date(),
        },
      }),
      this.prisma.node.update({
        where: { id: input.nodeId },
        data: {
          reputation: newReputation,
          lastActiveAt: new Date(),
        },
      }),
    ]);

    this.logger.log(`Work proof submitted for node ${input.nodeId}, reward: ${reward}`);

    return {
      success: true,
      message: 'Work proof submitted successfully',
      reward,
      newReputation,
    };
  }

  /**
   * 情感共识验证
   * PoUE 核心功能 - 验证多个节点对同一任务的情感分析是否达成共识
   */
  async emotionalConsensus(input: EmotionalConsensusInput): Promise<{
    consensusEmotion: string;
    consensusScore: number;
    intensityVariance: string;
    isValid: boolean;
    individualAnalyses: any[];
    timestamp: string;
  }> {
    const threshold = input.threshold || 0.7;
    
    if (input.inputs.length < 2) {
      throw new BadRequestException('Need at least 2 inputs for consensus');
    }

    // 分析每个输入的情感
    const analyses = await Promise.all(
      input.inputs.map(text => this.analyzeEmotion(text))
    );

    // 计算共识
    const primaryEmotions = analyses.map(a => a.primaryEmotion);
    
    // 统计主要情感出现频率
    const emotionCounts = new Map<string, number>();
    for (const emotion of primaryEmotions) {
      emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + 1);
    }

    // 找出共识情感
    let consensusEmotion = '';
    let consensusScore = 0;
    for (const [emotion, count] of emotionCounts) {
      const score = count / input.inputs.length;
      if (score > consensusScore) {
        consensusScore = score;
        consensusEmotion = emotion;
      }
    }

    // 计算情感强度方差
    const intensities = analyses.map(a => a.intensity);
    const meanIntensity = intensities.reduce((a, b) => a + b, 0) / intensities.length;
    const variance = intensities.reduce((sum, val) => sum + Math.pow(val - meanIntensity, 2), 0) / intensities.length;
    
    let intensityVariance: string;
    if (variance < 2) {
      intensityVariance = 'low';
    } else if (variance < 5) {
      intensityVariance = 'medium';
    } else {
      intensityVariance = 'high';
    }

    // 验证是否通过共识
    const isValid = consensusScore >= threshold && intensityVariance !== 'high';

    return {
      consensusEmotion,
      consensusScore,
      intensityVariance,
      isValid,
      individualAnalyses: analyses,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 防作弊检测
   * 检测节点是否可能存在作弊行为
   */
  async antiCheatCheck(input: AntiCheatCheckInput): Promise<{
    isValid: boolean;
    message: string;
    violations?: string[];
    riskScore?: number;
  }> {
    const violations: string[] = [];
    let riskScore = 0;

    // 1. 检查结果哈希是否重复（复制其他节点结果）
    const resultHash = input.resultHash || this.generateHash(input.aiResult);
    const nodeHistory = this.nodeResultHistory.get(input.nodeId) || [];
    
    if (nodeHistory.includes(resultHash)) {
      violations.push('DUPLICATE_RESULT: Result matches a previous submission');
      riskScore += 0.4;
    }

    // 2. 检查结果长度是否异常
    if (input.aiResult.length < 10) {
      violations.push('SHORT_RESULT: Result is suspiciously short');
      riskScore += 0.2;
    }

    if (input.aiResult.length > 50000) {
      violations.push('LONG_RESULT: Result is suspiciously long');
      riskScore += 0.2;
    }

    // 3. 检查是否包含可疑模式
    const suspiciousPatterns = [
      /^(.)\1{10,}/,  // 重复字符
      /^[a-zA-Z0-9+/]{50,}={0,2}$/,  // 可能是编码的随机数据
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(input.aiResult)) {
        violations.push('SUSPICIOUS_PATTERN: Result contains suspicious pattern');
        riskScore += 0.3;
        break;
      }
    }

    // 4. 检查节点历史成功率
    const node = await this.prisma.node.findUnique({
      where: { id: input.nodeId },
      select: { reputation: true, nodeType: true },
    });

    if (node && node.reputation < 50) {
      // 低信誉节点增加风险
      riskScore += 0.1;
    }

    // 更新节点历史
    nodeHistory.push(resultHash);
    if (nodeHistory.length > 100) {
      nodeHistory.shift();
    }
    this.nodeResultHistory.set(input.nodeId, nodeHistory);

    const isValid = riskScore < 0.5;

    if (!isValid) {
      this.stats.cheatingAttemptsDetected++;
    }

    return {
      isValid,
      message: isValid ? 'No violations detected' : 'Potential cheating detected',
      violations: violations.length > 0 ? violations : undefined,
      riskScore,
    };
  }

  /**
   * 获取 ZK-ML 统计信息
   */
  async getStats(): Promise<{
    totalProofsGenerated: number;
    totalProofsVerified: number;
    successRate: number;
    averageProofTime: number;
    cheatingAttemptsDetected: number;
  }> {
    return {
      totalProofsGenerated: this.stats.totalProofsGenerated,
      totalProofsVerified: this.stats.totalProofsVerified,
      successRate: this.stats.totalProofsVerified > 0 
        ? this.stats.successfulVerifications / this.stats.totalProofsVerified 
        : 0,
      averageProofTime: this.stats.totalProofsGenerated > 0 
        ? this.stats.totalProofTime / this.stats.totalProofsGenerated 
        : 0,
      cheatingAttemptsDetected: this.stats.cheatingAttemptsDetected,
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 生成 ZK 证明（模拟实现）
   * 实际实现中会调用 snarkjs 或其他 ZK 库
   */
  private async generateZKProof(params: {
    inputHash: string;
    modelHash: string;
    prompt: string;
    result: string;
  }): Promise<string> {
    // 模拟 ZK 证明生成
    // 在实际实现中，这里会：
    // 1. 将 AI 模型的输入、输出、参数编码为 ZK 电路输入
    // 2. 使用 snarkjs 生成证明
    
    const timestamp = Date.now();
    const circuitInput = this.generateHash(
      params.inputHash + params.modelHash + params.prompt + params.result + timestamp
    );

    // 模拟证明数据（实际会是 snarkjs 生成的证明）
    const proof = Buffer.from(JSON.stringify({
      pi_a: [this.generateRandomHex(32), this.generateRandomHex(32)],
      pi_b: [
        [this.generateRandomHex(32), this.generateRandomHex(32)],
        [this.generateRandomHex(32), this.generateRandomHex(32)]
      ],
      pi_c: [this.generateRandomHex(32), this.generateRandomHex(32)],
      protocol: 'groth16',
      curve: 'bn128',
      inputHash: params.inputHash,
      modelHash: params.modelHash,
      timestamp,
    })).toString('base64');

    return proof;
  }

  /**
   * 验证 ZK 证明
   */
  private async verifyZKProof(
    proof: string, 
    aiResult: string, 
    publicSignals: string
  ): Promise<boolean> {
    try {
      // 解析证明
      const proofData = JSON.parse(Buffer.from(proof, 'base64').toString());
      
      // 验证证明结构
      if (!proofData.pi_a || !proofData.pi_b || !proofData.pi_c) {
        return false;
      }

      // 验证公开信号
      if (publicSignals) {
        const signals = JSON.parse(Buffer.from(publicSignals, 'base64').toString());
        if (!signals.taskId || !signals.inputHash) {
          return false;
        }
      }

      // 模拟验证（实际会调用 snarkjs 的 verify 函数）
      // 这里简单验证证明格式是否正确
      return proofData.pi_a.length === 2 && 
             proofData.pi_b.length === 2 &&
             proofData.pi_c.length === 2;
    } catch (error) {
      this.logger.error(`Proof verification error: ${error.message}`);
      return false;
    }
  }

  /**
   * 生成公开信号
   */
  private generatePublicSignals(data: {
    taskId: string;
    inputHash: string;
    modelHash: string;
    timestamp: number;
  }): string {
    const signals = {
      taskId: data.taskId,
      inputHash: data.inputHash,
      modelHash: data.modelHash,
      timestamp: data.timestamp,
      version: '1.0',
    };
    
    return Buffer.from(JSON.stringify(signals)).toString('base64');
  }

  /**
   * 验证证明格式
   */
  private validateProofFormat(proof: string): boolean {
    try {
      const proofData = JSON.parse(Buffer.from(proof, 'base64').toString());
      return !!(
        proofData.pi_a && 
        proofData.pi_b && 
        proofData.pi_c &&
        proofData.protocol &&
        proofData.curve
      );
    } catch {
      return false;
    }
  }

  /**
   * 生成哈希
   */
  private generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 生成随机十六进制字符串
   */
  private generateRandomHex(length: number): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 计算奖励
   */
  private calculateReward(nodeType: string): number {
    const rewards: Record<string, number> = {
      CORE: 100,
      SUB: 50,
      NORMAL: 20,
    };
    return rewards[nodeType] || 20;
  }

  /**
   * 惩罚节点
   */
  private async punishNode(nodeId: string, type: string, reason: string): Promise<void> {
    const amount = type === 'CHEATING' ? 1000 : 500;
    
    await this.prisma.$transaction([
      this.prisma.punishment.create({
        data: {
          nodeId,
          type: type as any,
          amount,
          reason,
        },
      }),
      this.prisma.node.update({
        where: { id: nodeId },
        data: {
          status: NodeStatus.PUNISHING,
          reputation: { decrement: 20 },
        },
      }),
    ]);

    this.logger.warn(`Node ${nodeId} punished: ${reason}`);
  }

  /**
   * 分析情感（简化实现）
   * 实际会调用 AI 引擎的情感计算服务
   */
  private async analyzeEmotion(text: string): Promise<{
    primaryEmotion: string;
    sentiment: string;
    intensity: number;
  }> {
    // 检查缓存
    const cacheKey = this.generateHash(text);
    if (this.emotionCache.has(cacheKey)) {
      return this.emotionCache.get(cacheKey);
    }

    // 简化情感分析（实际会调用 emotional_computing.py）
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'wonderful', '好', '棒', '优秀', '开心'];
    const negativeWords = ['bad', 'terrible', 'awful', 'sad', 'hate', 'worst', '差', '糟糕', '难过'];
    
    const textLower = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of positiveWords) {
      if (textLower.includes(word)) positiveCount++;
    }
    for (const word of negativeWords) {
      if (textLower.includes(word)) negativeCount++;
    }

    let primaryEmotion = 'neutral';
    let sentiment = 'neutral';
    let intensity = 5.0;

    if (positiveCount > negativeCount) {
      primaryEmotion = 'joy';
      sentiment = 'positive';
      intensity = Math.min(10, 5 + positiveCount);
    } else if (negativeCount > positiveCount) {
      primaryEmotion = 'sadness';
      sentiment = 'negative';
      intensity = Math.min(10, 5 + negativeCount);
    }

    const result = { primaryEmotion, sentiment, intensity };
    this.emotionCache.set(cacheKey, result);
    
    return result;
  }
}