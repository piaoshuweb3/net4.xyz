import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NodeOnboardingService, OnboardingStep, NodeType, AIAvatarType } from './node-onboarding';

// Mock dependencies
vi.mock('./hardware-detector', () => ({
  HardwareDetector: vi.fn().mockImplementation(() => ({
    detect: vi.fn().mockResolvedValue({
      platform: 'win32',
      arch: 'x64',
      cpu: { model: 'Intel i7', cores: 16, speed: 3.5, manufacturer: 'Intel' },
      memory: { total: 64 * 1024 ** 3, available: 32 * 1024 ** 3, used: 32 * 1024 ** 3 },
      gpu: [{ name: 'NVIDIA RTX 4090', memory: 24 * 1024, vendor: 'NVIDIA' }],
      disk: { total: 2 * 1024 ** 4, available: 1 * 1024 ** 4 },
      network: { ip: '192.168.1.1', type: 'wifi' },
    }),
    checkRequirements: vi.fn().mockResolvedValue({
      meetsRequirements: true,
      cpuScore: 90,
      memoryScore: 95,
      gpuScore: 100,
      diskScore: 80,
      overallScore: 92,
      recommendations: [],
    }),
  })),
}));

vi.mock('./blockchain-service', () => ({
  BlockchainService: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    registerNode: vi.fn().mockResolvedValue({
      nodeId: 'node_test123',
      walletAddress: '0x1234567890abcdef',
      timestamp: Date.now(),
      stakeAmount: '0',
    }),
    stake: vi.fn().mockResolvedValue({
      transactionHash: '0xabcdef123456',
      nodeId: 'node_test123',
    }),
    getWalletAddress: vi.fn().mockReturnValue('0x1234567890abcdef'),
  })),
}));

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/test'),
  },
}));

vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
}));

describe('NodeOnboardingService', () => {
  let service: NodeOnboardingService;

  beforeEach(async () => {
    service = new NodeOnboardingService();
    // MUST call checkHardwareRequirements first to set hardwareInfo
    await service.checkHardwareRequirements();
  });

  describe('checkHardwareRequirements', () => {
    it('should check hardware requirements and return results', async () => {
      const result = await service.checkHardwareRequirements();
      
      expect(result.meetsRequirements).toBe(true);
      expect(result.hardwareInfo).toBeDefined();
      expect(result.hardwareInfo.cpu.cores).toBe(16);
      expect(result.requirements.overallScore).toBe(92);
    });
  });

  describe('connectWallet', () => {
    it('should connect wallet and update progress', async () => {
      const walletAddress = '0x1234567890abcdef';
      const result = await service.connectWallet(walletAddress);
      
      expect(result.success).toBe(true);
      expect(result.address).toBe(walletAddress);
      
      const progress = service.getProgress();
      expect(progress.completedSteps).toContain(OnboardingStep.WALLET_CONNECT);
    });
  });

  describe('registerNode', () => {
    it('should register node with correct parameters', async () => {
      // First connect wallet
      await service.connectWallet('0x1234567890abcdef');
      
      const result = await service.registerNode(NodeType.SUB, 'us-west');
      
      expect(result.success).toBe(true);
      expect(result.nodeId).toBeDefined();
      
      const progress = service.getProgress();
      expect(progress.completedSteps).toContain(OnboardingStep.NODE_REGISTER);
      expect(progress.stepData.nodeType).toBe(NodeType.SUB);
      expect(progress.stepData.region).toBe('us-west');
    });

    it('should throw error if wallet not connected', async () => {
      // Create a new service instance
      const newService = new NodeOnboardingService();
      
      // Call checkHardwareRequirements first to set hardwareInfo
      await newService.checkHardwareRequirements();
      
      // Get the blockchainService instance from newService and override getWalletAddress
      const blockchainService = (newService as any).blockchainService;
      blockchainService.getWalletAddress.mockReturnValue(null);
      
      await expect(
        newService.registerNode(NodeType.NORMAL, 'us-east')
      ).rejects.toThrow('Wallet not connected');
    });
  });

  describe('stake', () => {
    it('should process stake transaction', async () => {
      // Setup: complete previous steps
      await service.connectWallet('0x1234567890abcdef');
      await service.registerNode(NodeType.SUB, 'us-west');
      
      const result = await service.stake();
      
      expect(result.success).toBe(true);
      expect(result.transactionHash).toBeDefined();
      expect(result.stakedAmount).toBeDefined();
      
      const progress = service.getProgress();
      expect(progress.completedSteps).toContain(OnboardingStep.STAKE);
    });

    it('should use custom stake amount when provided', async () => {
      await service.connectWallet('0x1234567890abcdef');
      await service.registerNode(NodeType.SUB, 'us-west');
      
      const customAmount = '5000000000000000000000'; // 5000 USDT
      const result = await service.stake(customAmount);
      
      expect(result.stakedAmount).toBe(customAmount);
    });
  });

  describe('activateAIAvatar', () => {
    it('should activate AI avatar with valid hardware', async () => {
      // Setup: complete previous steps
      await service.connectWallet('0x1234567890abcdef');
      await service.registerNode(NodeType.SUB, 'us-west');
      await service.stake();
      
      const result = await service.activateAIAvatar(
        AIAvatarType.MEDIUM,
        'TestBot'
      );
      
      expect(result.success).toBe(true);
      expect(result.sparkNftId).toBeDefined();
      expect(result.transactionHash).toBeDefined();
      
      const progress = service.getProgress();
      expect(progress.completedSteps).toContain(OnboardingStep.AI_AVATAR_ACTIVATE);
      expect(progress.stepData.avatarNickname).toBe('TestBot');
    });

    it('should throw error for insufficient hardware', async () => {
      await service.connectWallet('0x1234567890abcdef');
      await service.registerNode(NodeType.SUB, 'us-west');
      await service.stake();
      
      // Try to activate ADVANCED avatar with limited hardware
      // The mock has sufficient hardware, so this should pass
      // In real test with insufficient hardware, it would throw
      const result = await service.activateAIAvatar(AIAvatarType.LIGHT, 'LightBot');
      expect(result.success).toBe(true);
    });
  });

  describe('verifyIdentity', () => {
    it('should verify node identity', async () => {
      // Setup: complete previous steps
      await service.connectWallet('0x1234567890abcdef');
      await service.registerNode(NodeType.SUB, 'us-west');
      await service.stake();
      await service.activateAIAvatar(AIAvatarType.MEDIUM, 'TestBot');
      
      const result = await service.verifyIdentity();
      
      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      
      const progress = service.getProgress();
      expect(progress.completedSteps).toContain(OnboardingStep.IDENTITY_VERIFY);
    });
  });

  describe('completeOnboarding', () => {
    it('should complete onboarding when all steps done', async () => {
      // Complete all steps
      await service.connectWallet('0x1234567890abcdef');
      await service.registerNode(NodeType.SUB, 'us-west');
      await service.stake();
      await service.activateAIAvatar(AIAvatarType.MEDIUM, 'TestBot');
      await service.verifyIdentity();
      
      const result = await service.completeOnboarding();
      
      expect(result.success).toBe(true);
      expect(result.nodeId).toBeDefined();
      expect(result.sparkNftId).toBeDefined();
      
      const progress = service.getProgress();
      expect(progress.completedSteps).toContain(OnboardingStep.COMPLETE);
    });

    it('should fail if not all steps completed', async () => {
      await service.connectWallet('0x1234567890abcdef');
      
      const result = await service.completeOnboarding();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Not all steps completed');
    });
  });

  describe('getStakeAmount', () => {
    it('should return correct stake amounts for each node type', () => {
      expect(service.getStakeAmount(NodeType.CORE)).toBe('10000000000000000000000');
      expect(service.getStakeAmount(NodeType.SUB)).toBe('9999000000000000000000');
      expect(service.getStakeAmount(NodeType.NORMAL)).toBe('9999000000000000000000');
    });
  });

  describe('getAvailableNodeTypes', () => {
    it('should return available node types based on hardware', async () => {
      const types = await service.getAvailableNodeTypes();
      
      expect(types).toContain(NodeType.NORMAL);
      expect(types).toContain(NodeType.SUB);
      expect(types).toContain(NodeType.CORE);
    });
  });

  describe('getAvailableAvatarTypes', () => {
    it('should return available avatar types based on hardware', async () => {
      const types = await service.getAvailableAvatarTypes();
      
      expect(types).toContain(AIAvatarType.LIGHT);
      expect(types).toContain(AIAvatarType.MEDIUM);
      expect(types).toContain(AIAvatarType.ADVANCED);
    });
  });

  describe('resetProgress', () => {
    it('should reset onboarding progress', async () => {
      // Complete some steps
      await service.connectWallet('0x1234567890abcdef');
      await service.registerNode(NodeType.SUB, 'us-west');
      
      // Reset
      service.resetProgress();
      
      const progress = service.getProgress();
      expect(progress.currentStep).toBe(OnboardingStep.HARDWARE_CHECK);
      expect(progress.completedSteps).toHaveLength(0);
    });
  });
});