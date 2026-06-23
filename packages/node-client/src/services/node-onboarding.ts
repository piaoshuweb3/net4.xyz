import log from 'electron-log';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { HardwareDetector, HardwareInfo, HardwareRequirements } from './hardware-detector';
import { BlockchainService, NodeRegistration, NodeStatus } from './blockchain-service';

export enum OnboardingStep {
  HARDWARE_CHECK = 'hardware_check',
  WALLET_CONNECT = 'wallet_connect',
  NODE_REGISTER = 'node_register',
  STAKE = 'stake',
  AI_AVATAR_ACTIVATE = 'ai_avatar_activate',
  IDENTITY_VERIFY = 'identity_verify',
  COMPLETE = 'complete',
}

export enum NodeType {
  CORE = 'CORE',
  SUB = 'SUB',
  NORMAL = 'NORMAL',
}

export enum AIAvatarType {
  LIGHT = 'LIGHT',
  MEDIUM = 'MEDIUM',
  ADVANCED = 'ADVANCED',
}

export interface OnboardingProgress {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  stepData: Record<string, any>;
}

export interface NodeOnboardingResult {
  success: boolean;
  nodeId?: string;
  transactionHash?: string;
  sparkNftId?: string;
  error?: string;
}

// Stake amounts in USDT (wei)
const STAKE_AMOUNTS: Record<NodeType, string> = {
  [NodeType.CORE]: '10000000000000000000000', // 10,000 USDT
  [NodeType.SUB]: '9999000000000000000000',   // 9,999 USDT
  [NodeType.NORMAL]: '9999000000000000000000', // 9,999 USDT
};

// AI Avatar type requirements
const AVATAR_REQUIREMENTS: Record<AIAvatarType, { minMemoryGB: number; minCores: number; gpuRequired: boolean }> = {
  [AIAvatarType.LIGHT]: { minMemoryGB: 4, minCores: 2, gpuRequired: false },
  [AIAvatarType.MEDIUM]: { minMemoryGB: 16, minCores: 8, gpuRequired: true },
  [AIAvatarType.ADVANCED]: { minMemoryGB: 32, minCores: 16, gpuRequired: true },
};

export class NodeOnboardingService {
  private hardwareDetector: HardwareDetector;
  private blockchainService: BlockchainService;
  private progressPath: string;
  private progress: OnboardingProgress;

  constructor() {
    this.hardwareDetector = new HardwareDetector();
    this.blockchainService = new BlockchainService();
    this.progressPath = path.join(app.getPath('userData'), 'onboarding-progress.json');
    this.progress = this.loadProgress();
  }

  private loadProgress(): OnboardingProgress {
    try {
      if (fs.existsSync(this.progressPath)) {
        const data = fs.readFileSync(this.progressPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      log.error('Error loading onboarding progress:', error);
    }
    return {
      currentStep: OnboardingStep.HARDWARE_CHECK,
      completedSteps: [],
      stepData: {},
    };
  }

  private saveProgress(): void {
    try {
      const dir = path.dirname(this.progressPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.progressPath, JSON.stringify(this.progress, null, 2));
    } catch (error) {
      log.error('Error saving onboarding progress:', error);
    }
  }

  /**
   * Step 1: Check hardware requirements
   */
  async checkHardwareRequirements(): Promise<{ meetsRequirements: boolean; hardwareInfo: HardwareInfo; requirements: HardwareRequirements }> {
    log.info('Checking hardware requirements...');
    
    const hardwareInfo = await this.hardwareDetector.detect();
    const requirements = await this.hardwareDetector.checkRequirements();
    
    this.progress.stepData.hardwareInfo = hardwareInfo;
    this.progress.stepData.hardwareRequirements = requirements;
    this.completeStep(OnboardingStep.HARDWARE_CHECK);
    this.saveProgress();
    
    return {
      meetsRequirements: requirements.meetsRequirements,
      hardwareInfo,
      requirements,
    };
  }

  /**
   * Step 2: Connect wallet
   */
  async connectWallet(walletAddress: string): Promise<{ success: boolean; address: string }> {
    log.info(`Connecting wallet: ${walletAddress}`);
    
    try {
      await this.blockchainService.connect(walletAddress);
      
      this.progress.stepData.walletAddress = walletAddress;
      this.completeStep(OnboardingStep.WALLET_CONNECT);
      
      return { success: true, address: walletAddress };
    } catch (error) {
      log.error('Wallet connection error:', error);
      throw error;
    }
  }

  /**
   * Step 3: Register node
   */
  async registerNode(
    nodeType: NodeType,
    region: string,
    backendApiUrl?: string
  ): Promise<{ success: boolean; nodeId: string; transactionHash?: string }> {
    log.info(`Registering node: type=${nodeType}, region=${region}`);
    
    const walletAddress = this.blockchainService.getWalletAddress();
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    const hardwareInfo = this.progress.stepData.hardwareInfo;
    if (!hardwareInfo) {
      throw new Error('Hardware info not available. Please run hardware check first.');
    }

    try {
      // Register on blockchain (local mock for now)
      const registration = await this.blockchainService.registerNode(hardwareInfo);
      
      // Also register with backend if API URL provided
      if (backendApiUrl) {
        await this.registerWithBackend(backendApiUrl, {
          nodeType,
          walletAddress,
          hardwareInfo,
          region,
          nodeId: registration.nodeId,
        });
      }

      this.progress.stepData.nodeType = nodeType;
      this.progress.stepData.region = region;
      this.progress.stepData.nodeId = registration.nodeId;
      this.completeStep(OnboardingStep.NODE_REGISTER);
      
      return {
        success: true,
        nodeId: registration.nodeId,
        transactionHash: registration.timestamp.toString(),
      };
    } catch (error) {
      log.error('Node registration error:', error);
      throw error;
    }
  }

  /**
   * Step 4: Stake (pay the stake amount)
   */
  async stake(amount?: string): Promise<{ success: boolean; transactionHash: string; stakedAmount: string }> {
    log.info('Processing stake...');
    
    const nodeType = this.progress.stepData.nodeType as NodeType;
    const stakeAmount = amount || STAKE_AMOUNTS[nodeType];
    
    if (!stakeAmount) {
      throw new Error('Node type not set. Please register node first.');
    }

    try {
      const result = await this.blockchainService.stake(stakeAmount);
      
      this.progress.stepData.stakeAmount = stakeAmount;
      this.progress.stepData.stakeTxHash = result.transactionHash;
      this.completeStep(OnboardingStep.STAKE);
      
      return {
        success: true,
        transactionHash: result.transactionHash,
        stakedAmount: stakeAmount,
      };
    } catch (error) {
      log.error('Stake error:', error);
      throw error;
    }
  }

  /**
   * Step 5: Activate AI Avatar
   */
  async activateAIAvatar(
    avatarType: AIAvatarType,
    nickname: string,
    backendApiUrl?: string
  ): Promise<{ success: boolean; sparkNftId: string; transactionHash: string }> {
    log.info(`Activating AI Avatar: type=${avatarType}, nickname=${nickname}`);
    
    // Verify hardware meets avatar requirements
    const requirements = AVATAR_REQUIREMENTS[avatarType];
    const hardwareInfo = this.progress.stepData.hardwareInfo as HardwareInfo;
    const hardwareCheck = this.progress.stepData.hardwareRequirements;
    
    if (!hardwareInfo || !hardwareCheck) {
      throw new Error('Hardware info not available. Please run hardware check first.');
    }

    const memoryGB = hardwareInfo.memory.total / (1024 ** 3);
    if (memoryGB < requirements.minMemoryGB) {
      throw new Error(`Insufficient memory for ${avatarType} avatar. Need ${requirements.minMemoryGB}GB, have ${memoryGB.toFixed(1)}GB`);
    }

    if (hardwareInfo.cpu.cores < requirements.minCores) {
      throw new Error(`Insufficient CPU cores for ${avatarType} avatar. Need ${requirements.minCores}, have ${hardwareInfo.cpu.cores}`);
    }

    if (requirements.gpuRequired && hardwareInfo.gpu.length === 0) {
      throw new Error(`GPU required for ${avatarType} avatar but none detected`);
    }

    // Generate mock Spark NFT ID (in production, this would mint an NFT)
    const sparkNftId = `spark_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const mockTxHash = `0x${Buffer.from(`avatar_${Date.now()}`).toString('hex')}`;

    // Register with backend if API URL provided
    if (backendApiUrl) {
      await this.registerAIAvatarWithBackend(backendApiUrl, {
        nodeId: this.progress.stepData.nodeId,
        avatarType,
        nickname,
        sparkNftId,
      });
    }

    this.progress.stepData.avatarType = avatarType;
    this.progress.stepData.avatarNickname = nickname;
    this.progress.stepData.sparkNftId = sparkNftId;
    this.progress.stepData.avatarTxHash = mockTxHash;
    this.completeStep(OnboardingStep.AI_AVATAR_ACTIVATE);
    
    return {
      success: true,
      sparkNftId,
      transactionHash: mockTxHash,
    };
  }

  /**
   * Step 6: Verify node identity
   */
  async verifyIdentity(verificationCode?: string): Promise<{ success: boolean; verified: boolean; message: string }> {
    log.info('Verifying node identity...');
    
    const nodeId = this.progress.stepData.nodeId;
    if (!nodeId) {
      throw new Error('Node not registered. Please register node first.');
    }

    // In production, this would:
    // 1. Generate a unique verification code
    // 2. Send it to the user's wallet as a message to sign
    // 3. Verify the signature
    
    // For now, we'll simulate verification
    const verified = true;
    const message = verified 
      ? 'Node identity verified successfully'
      : 'Verification pending. Please sign the verification message with your wallet.';

    if (verified) {
      this.progress.stepData.identityVerified = true;
      this.progress.stepData.verificationCode = verificationCode || 'auto_verified';
      this.completeStep(OnboardingStep.IDENTITY_VERIFY);
    }

    return {
      success: true,
      verified,
      message,
    };
  }

  /**
   * Complete the onboarding process
   */
  async completeOnboarding(): Promise<NodeOnboardingResult> {
    log.info('Completing node onboarding...');
    
    const requiredSteps = [
      OnboardingStep.HARDWARE_CHECK,
      OnboardingStep.WALLET_CONNECT,
      OnboardingStep.NODE_REGISTER,
      OnboardingStep.STAKE,
      OnboardingStep.AI_AVATAR_ACTIVATE,
      OnboardingStep.IDENTITY_VERIFY,
    ];

    const allCompleted = requiredSteps.every(step => 
      this.progress.completedSteps.includes(step)
    );

    if (!allCompleted) {
      return {
        success: false,
        error: 'Not all steps completed. Please complete all onboarding steps.',
      };
    }

    this.completeStep(OnboardingStep.COMPLETE);

    return {
      success: true,
      nodeId: this.progress.stepData.nodeId,
      transactionHash: this.progress.stepData.stakeTxHash,
      sparkNftId: this.progress.stepData.sparkNftId,
    };
  }

  /**
   * Get current onboarding progress
   */
  getProgress(): OnboardingProgress {
    return this.progress;
  }

  /**
   * Reset onboarding progress
   */
  resetProgress(): void {
    this.progress = {
      currentStep: OnboardingStep.HARDWARE_CHECK,
      completedSteps: [],
      stepData: {},
    };
    this.saveProgress();
  }

  /**
   * Get stake amount for node type
   */
  getStakeAmount(nodeType: NodeType): string {
    return STAKE_AMOUNTS[nodeType];
  }

  /**
   * Get available node types based on hardware
   */
  async getAvailableNodeTypes(): Promise<NodeType[]> {
    const requirements = await this.hardwareDetector.checkRequirements();
    const types: NodeType[] = [];

    if (requirements.overallScore >= 90) {
      types.push(NodeType.CORE);
    }
    if (requirements.overallScore >= 60) {
      types.push(NodeType.SUB);
    }
    types.push(NodeType.NORMAL);

    return types;
  }

  /**
   * Get available AI avatar types based on hardware
   */
  async getAvailableAvatarTypes(): Promise<AIAvatarType[]> {
    const hardwareInfo = await this.hardwareDetector.detect();
    const memoryGB = hardwareInfo.memory.total / (1024 ** 3);
    const cores = hardwareInfo.cpu.cores;
    const hasGpu = hardwareInfo.gpu.length > 0;

    const types: AIAvatarType[] = [];

    if (memoryGB >= 4 && cores >= 2) {
      types.push(AIAvatarType.LIGHT);
    }
    if (memoryGB >= 16 && cores >= 8 && hasGpu) {
      types.push(AIAvatarType.MEDIUM);
    }
    if (memoryGB >= 32 && cores >= 16 && hasGpu) {
      types.push(AIAvatarType.ADVANCED);
    }

    return types;
  }

  private completeStep(step: OnboardingStep): void {
    if (!this.progress.completedSteps.includes(step)) {
      this.progress.completedSteps.push(step);
    }
    this.progress.currentStep = step;
    this.saveProgress();
  }

  private async registerWithBackend(apiUrl: string, data: any): Promise<void> {
    try {
      const response = await fetch(`${apiUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation RegisterNode($input: RegisterNodeInput!) {
              registerNode(input: $input) {
                id
                nodeType
                status
              }
            }
          `,
          variables: {
            input: {
              nodeType: data.nodeType,
              region: data.region,
              hardwareInfo: JSON.stringify(data.hardwareInfo),
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend registration failed: ${response.statusText}`);
      }

      log.info('Node registered with backend successfully');
    } catch (error) {
      log.error('Backend registration error:', error);
      // Don't throw - blockchain registration is the primary path
    }
  }

  private async registerAIAvatarWithBackend(apiUrl: string, data: any): Promise<void> {
    try {
      const response = await fetch(`${apiUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation ActivateAIAvatar($nodeId: ID!, $avatarType: String!, $nickname: String!, $sparkNftId: String!) {
              activateAIAvatar(nodeId: $nodeId, avatarType: $avatarType, nickname: $nickname, sparkNftId: $sparkNftId) {
                id
                status
              }
            }
          `,
          variables: {
            nodeId: data.nodeId,
            avatarType: data.avatarType,
            nickname: data.nickname,
            sparkNftId: data.sparkNftId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend avatar activation failed: ${response.statusText}`);
      }

      log.info('AI Avatar registered with backend successfully');
    } catch (error) {
      log.error('Backend avatar activation error:', error);
      // Don't throw - blockchain activation is the primary path
    }
  }
}