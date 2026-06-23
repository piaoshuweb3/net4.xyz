import { Test, TestingModule } from '@nestjs/testing';
import { ZKMLService } from '../zkml.service';
import { PrismaService } from '../../common/services/prisma.service';
import { TaskStatus, NodeStatus, NodeType } from '@prisma/client';

describe('ZKMLService', () => {
  let service: ZKMLService;
  let prisma: any;

  const mockPrisma = {
    aITask: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    node: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    punishment: {
      create: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZKMLService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ZKMLService>(ZKMLService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateProof', () => {
    it('should generate a ZK proof for a valid task', async () => {
      const taskId = 'task-123';
      const input = {
        taskId,
        prompt: 'Test prompt',
        aiResult: 'Test result',
        modelHash: 'model-hash-123',
      };

      mockPrisma.aITask.findUnique.mockResolvedValue({
        id: taskId,
        status: TaskStatus.PROCESSING,
      });

      mockPrisma.aITask.update.mockResolvedValue({
        id: taskId,
        status: TaskStatus.COMPLETED,
        result: input.aiResult,
      });

      const result = await service.generateProof(input);

      expect(result.taskId).toBe(taskId);
      expect(result.proof).toBeDefined();
      expect(result.publicSignals).toBeDefined();
      expect(result.proofHash).toBeDefined();
      expect(result.generationTime).toBeGreaterThan(0);
    });

    it('should throw error for non-existent task', async () => {
      mockPrisma.aITask.findUnique.mockResolvedValue(null);

      await expect(
        service.generateProof({
          taskId: 'non-existent',
          prompt: 'test',
          aiResult: 'result',
          modelHash: 'hash',
        }),
      ).rejects.toThrow('Task not found');
    });

    it('should throw error for task in invalid state', async () => {
      mockPrisma.aITask.findUnique.mockResolvedValue({
        id: 'task-123',
        status: TaskStatus.VERIFIED,
      });

      await expect(
        service.generateProof({
          taskId: 'task-123',
          prompt: 'test',
          aiResult: 'result',
          modelHash: 'hash',
        }),
      ).rejects.toThrow('Task is not in valid state for proof generation');
    });
  });

  describe('verifyProof', () => {
    it('should verify a valid proof', async () => {
      const taskId = 'task-123';
      const proof = Buffer.from(
        JSON.stringify({
          pi_a: ['0x1', '0x2'],
          pi_b: [['0x1', '0x2'], ['0x3', '0x4']],
          pi_c: ['0x1', '0x2'],
          protocol: 'groth16',
          curve: 'bn128',
        }),
      ).toString('base64');

      mockPrisma.aITask.findUnique.mockResolvedValue({
        id: taskId,
        status: TaskStatus.COMPLETED,
      });

      mockPrisma.aITask.update.mockResolvedValue({
        id: taskId,
        status: TaskStatus.VERIFIED,
      });

      const result = await service.verifyProof({
        taskId,
        proof,
        aiResult: 'test result',
        publicSignals: '',
      });

      expect(result.isValid).toBe(true);
      expect(result.message).toBe('Proof verified successfully');
    });

    it('should reject invalid proof format', async () => {
      mockPrisma.aITask.findUnique.mockResolvedValue({
        id: 'task-123',
        status: TaskStatus.COMPLETED,
      });

      const result = await service.verifyProof({
        taskId: 'task-123',
        proof: 'invalid-proof',
        aiResult: 'test result',
        publicSignals: '',
      });

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_PROOF_FORMAT');
    });
  });

  describe('emotionalConsensus', () => {
    it('should calculate emotional consensus for multiple inputs', async () => {
      const inputs = [
        'This is a great and wonderful day!',
        'I feel so happy and excellent today!',
        'What a marvelous and joyful experience!',
      ];

      const result = await service.emotionalConsensus({ inputs });

      expect(result.consensusEmotion).toBeDefined();
      expect(result.consensusScore).toBeGreaterThan(0);
      expect(result.intensityVariance).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.individualAnalyses).toHaveLength(3);
    });

    it('should throw error for less than 2 inputs', async () => {
      await expect(
        service.emotionalConsensus({ inputs: ['single input'] }),
      ).rejects.toThrow('Need at least 2 inputs for consensus');
    });
  });

  describe('antiCheatCheck', () => {
    it('should detect duplicate results', async () => {
      const nodeId = 'node-123';
      const taskId = 'task-123';
      const aiResult = 'test result';

      // First submission
      await service.antiCheatCheck({ nodeId, taskId, aiResult });

      // Second submission with same result
      const result = await service.antiCheatCheck({ nodeId, taskId, aiResult });

      expect(result.violations).toContain('DUPLICATE_RESULT: Result matches a previous submission');
      expect(result.riskScore).toBeGreaterThan(0.3);
    });

    it('should detect suspiciously short results', async () => {
      const result = await service.antiCheatCheck({
        nodeId: 'node-123',
        taskId: 'task-123',
        aiResult: 'a',
      });

      expect(result.violations).toContain('SHORT_RESULT: Result is suspiciously short');
    });

    it('should accept valid results', async () => {
      const result = await service.antiCheatCheck({
        nodeId: 'node-123',
        taskId: 'task-123',
        aiResult: 'This is a valid AI response with meaningful content.',
      });

      expect(result.isValid).toBe(true);
      expect(result.violations).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      const stats = await service.getStats();

      expect(stats).toHaveProperty('totalProofsGenerated');
      expect(stats).toHaveProperty('totalProofsVerified');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('averageProofTime');
      expect(stats).toHaveProperty('cheatingAttemptsDetected');
    });
  });
});