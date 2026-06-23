/**
 * ZK Proof Service Tests
 * 
 * Requirements: 5.1, 11.2
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZKProofService, ZKProofData } from './zk-proof-service';

// Mock electron-log
vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ZKProofService', () => {
  let zkProofService: ZKProofService;

  beforeEach(() => {
    zkProofService = new ZKProofService();
  });

  describe('generateProof', () => {
    it('should generate a valid ZK proof', async () => {
      const input = {
        prompt: 'Analyze the emotional content of: Hello world',
        aiResult: 'The text expresses a neutral to positive sentiment with low intensity.',
        modelType: 'llama3-8b',
        taskId: 'task_123',
        nodeId: 'node_456',
      };

      const proof = await zkProofService.generateProof(input);

      expect(proof).toBeDefined();
      expect(proof.proof).toBeDefined();
      expect(proof.proofHash).toBeDefined();
      expect(proof.publicSignals).toBeDefined();
      expect(proof.publicSignals.inputHash).toBeDefined();
      expect(proof.publicSignals.modelHash).toBeDefined();
      expect(proof.publicSignals.taskId).toBe('task_123');
      expect(proof.publicSignals.nodeId).toBe('node_456');
      expect(proof.generationTimeMs).toBeGreaterThan(0);
    });

    it('should include model type in public signals', async () => {
      const input = {
        prompt: 'Test prompt',
        aiResult: 'Test result',
        modelType: 'gpt-4o',
      };

      const proof = await zkProofService.generateProof(input);

      expect(proof.publicSignals.modelType).toBe('gpt-4o');
    });

    it('should generate different proofs for different inputs', async () => {
      const input1 = {
        prompt: 'Prompt 1',
        aiResult: 'Result 1',
        modelType: 'llama3-8b',
      };

      const input2 = {
        prompt: 'Prompt 2',
        aiResult: 'Result 2',
        modelType: 'llama3-8b',
      };

      const proof1 = await zkProofService.generateProof(input1);
      const proof2 = await zkProofService.generateProof(input2);

      expect(proof1.proofHash).not.toBe(proof2.proofHash);
      expect(proof1.publicSignals.inputHash).not.toBe(proof2.publicSignals.inputHash);
    });
  });

  describe('verifyProof', () => {
    it('should verify a valid proof', async () => {
      const input = {
        prompt: 'Test prompt',
        aiResult: 'Test result',
        modelType: 'llama3-8b',
      };

      const proof = await zkProofService.generateProof(input);
      const result = await zkProofService.verifyProof(
        proof.proof,
        input.aiResult,
        proof.publicSignals
      );

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should reject proof with invalid structure', async () => {
      const invalidProof = JSON.stringify({
        pi_a: ['invalid'],
        // Missing pi_b, pi_c, protocol, curve
      });

      const result = await zkProofService.verifyProof(
        invalidProof,
        'test result',
        {
          inputHash: 'hash',
          modelHash: 'hash',
          timestamp: Date.now(),
          circuitVersion: '1.0.0',
          modelType: 'test',
        }
      );

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_STRUCTURE');
    });

    it('should reject proof with missing public signals', async () => {
      const input = {
        prompt: 'Test prompt',
        aiResult: 'Test result',
        modelType: 'llama3-8b',
      };

      const proof = await zkProofService.generateProof(input);
      
      // Remove required signal
      const invalidSignals = { ...proof.publicSignals };
      delete invalidSignals.inputHash;

      const result = await zkProofService.verifyProof(
        proof.proof,
        input.aiResult,
        invalidSignals as any
      );

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_SIGNALS');
    });
  });

  describe('getStats', () => {
    it('should track proof generation stats', async () => {
      // Mock Date.now to return incrementing values to ensure generationTimeMs > 0
      let now = 1000;
      vi.spyOn(Date, 'now').mockImplementation(() => now += 10);
      
      // Generate some proofs
      await zkProofService.generateProof({
        prompt: 'Test 1',
        aiResult: 'Result 1',
        modelType: 'llama3-8b',
      });

      await zkProofService.generateProof({
        prompt: 'Test 2',
        aiResult: 'Result 2',
        modelType: 'llama3-8b',
      });

      const stats = zkProofService.getStats();

      expect(stats.totalProofsGenerated).toBe(2);
      expect(stats.averageProofTimeMs).toBeGreaterThan(0);
      expect(stats.circuitVersion).toBeDefined();
    });

    it('should track verification stats', async () => {
      const proof = await zkProofService.generateProof({
        prompt: 'Test',
        aiResult: 'Result',
        modelType: 'llama3-8b',
      });

      await zkProofService.verifyProof(
        proof.proof,
        'Result',
        proof.publicSignals
      );

      const stats = zkProofService.getStats();

      expect(stats.totalProofsVerified).toBe(1);
      expect(stats.successRate).toBe(1);
    });
  });

  describe('config', () => {
    it('should allow config updates', () => {
      zkProofService.updateConfig({
        circuitVersion: '2.0.0',
        enableProofGeneration: false,
      });

      const config = zkProofService.getConfig();

      expect(config.circuitVersion).toBe('2.0.0');
      expect(config.enableProofGeneration).toBe(false);
    });
  });
});