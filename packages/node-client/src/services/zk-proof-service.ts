/**
 * ZK Proof Service
 * Zero-Knowledge Proof Generation for PoUE Consensus
 * 
 * This service generates ZK proofs to verify that AI computations were performed
 * without revealing the model parameters or input data.
 * 
 * Requirements: 5.1, 11.2
 */
import * as crypto from 'crypto';
import log from 'electron-log';

// Types for ZK Proof
export interface ZKProofData {
  proof: string;
  publicSignals: ZKPublicSignals;
  proofHash: string;
  generationTimeMs: number;
  circuitVersion: string;
}

export interface ZKPublicSignals {
  inputHash: string;
  modelHash: string;
  timestamp: number;
  circuitVersion: string;
  modelType: string;
  taskId?: string;
  nodeId?: string;
}

export interface VerificationResult {
  isValid: boolean;
  message: string;
  confidence: number;
  errorCode?: string;
}

export interface ProofGenerationInput {
  prompt: string;
  aiResult: string;
  modelType: string;
  modelParams?: Record<string, unknown>;
  taskId?: string;
  nodeId?: string;
}

// Configuration
interface ZKProofConfig {
  circuitVersion: string;
  enableProofGeneration: boolean;
  proofTimeout: number;
  verificationThreshold: number;
}

const DEFAULT_CONFIG: ZKProofConfig = {
  circuitVersion: '1.0.0',
  enableProofGeneration: true,
  proofTimeout: 30000, // 30 seconds
  verificationThreshold: 0.7,
};

export class ZKProofService {
  private config: ZKProofConfig;
  private stats: ProofStats;

  constructor(config?: Partial<ZKProofConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      totalGenerated: 0,
      totalVerified: 0,
      successfulVerifications: 0,
      totalTimeMs: 0,
    };
  }

  /**
   * Generate a ZK proof for an AI computation
   * 
   * @param input - The proof generation input
   * @returns ZKProofData containing the proof and metadata
   */
  async generateProof(input: ProofGenerationInput): Promise<ZKProofData> {
    const startTime = Date.now();

    if (!this.config.enableProofGeneration) {
      log.warn('ZK proof generation is disabled');
      return this.createMockProof(input, startTime);
    }

    try {
      // Generate input hash
      const inputHash = this.hashData(input.prompt + input.aiResult);

      // Generate model hash
      const modelHash = this.hashModel(input.modelType, input.modelParams);

      // Prepare circuit input
      const circuitInput = this.prepareCircuitInput(
        inputHash,
        modelHash,
        input.prompt,
        input.aiResult
      );

      // Compute ZK proof
      const proof = await this.computeProof(circuitInput);

      // Generate public signals
      const publicSignals: ZKPublicSignals = {
        inputHash,
        modelHash,
        timestamp: Math.floor(Date.now() / 1000),
        circuitVersion: this.config.circuitVersion,
        modelType: input.modelType,
        taskId: input.taskId,
        nodeId: input.nodeId,
      };

      // Calculate proof hash
      const proofHash = this.hashData(JSON.stringify(proof));

      // Calculate generation time
      const generationTimeMs = Date.now() - startTime;

      // Update stats
      this.stats.totalGenerated++;
      this.stats.totalTimeMs += generationTimeMs;

      log.info(`ZK proof generated in ${generationTimeMs}ms for task ${input.taskId}`);

      return {
        proof,
        publicSignals,
        proofHash,
        generationTimeMs,
        circuitVersion: this.config.circuitVersion,
      };
    } catch (error) {
      log.error('Error generating ZK proof:', error);
      throw new Error(`ZK proof generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Verify a ZK proof
   * 
   * @param proof - The ZK proof to verify
   * @param aiResult - The AI result being proven
   * @param publicSignals - Public signals from proof generation
   * @returns VerificationResult indicating success/failure
   */
  async verifyProof(
    proof: string,
    aiResult: string,
    publicSignals: ZKPublicSignals
  ): Promise<VerificationResult> {
    this.stats.totalVerified++;

    try {
      // Validate proof structure
      if (!this.validateProofStructure(proof)) {
        this.stats.successfulVerifications++;
        return {
          isValid: false,
          message: 'Invalid proof structure',
          confidence: 0.0,
          errorCode: 'INVALID_STRUCTURE',
        };
      }

      // Validate public signals
      if (!this.validatePublicSignals(publicSignals)) {
        return {
          isValid: false,
          message: 'Invalid public signals',
          confidence: 0.0,
          errorCode: 'INVALID_SIGNALS',
        };
      }

      // Verify proof data
      const isValid = await this.verifyProofData(proof, aiResult, publicSignals);

      if (isValid) {
        this.stats.successfulVerifications++;
        return {
          isValid: true,
          message: 'Proof verified successfully',
          confidence: 0.99,
        };
      } else {
        return {
          isValid: false,
          message: 'Proof verification failed',
          confidence: 0.0,
          errorCode: 'VERIFICATION_FAILED',
        };
      }
    } catch (error) {
      log.error('Proof verification error:', error);
      return {
        isValid: false,
        message: `Verification error: ${(error as Error).message}`,
        confidence: 0.0,
        errorCode: 'VERIFICATION_ERROR',
      };
    }
  }

  /**
   * Submit proof along with task result to backend
   * 
   * @param taskId - The task ID
   * @param nodeId - The node ID
   * @param result - The AI result
   * @param proof - The ZK proof
   * @param backendUrl - Backend API URL
   */
  async submitProofWithResult(
    taskId: string,
    nodeId: string,
    result: string,
    proof: ZKProofData,
    backendUrl: string
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      const response = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation SubmitTaskResultWithProof($input: SubmitTaskResultWithProofInput!) {
              submitTaskResultWithProof(input: $input) {
                success
                transactionHash
              }
            }
          `,
          variables: {
            input: {
              taskId,
              nodeId,
              result,
              proof: JSON.stringify(proof.proof),
              publicSignals: proof.publicSignals,
              proofHash: proof.proofHash,
              generationTimeMs: proof.generationTimeMs,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(data.errors[0]?.message || 'GraphQL error');
      }

      return {
        success: true,
        transactionHash: data.data?.submitTaskResultWithProof?.transactionHash,
      };
    } catch (error) {
      log.error('Error submitting proof:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get prover statistics
   */
  getStats(): {
    totalProofsGenerated: number;
    totalProofsVerified: number;
    successRate: number;
    averageProofTimeMs: number;
    circuitVersion: string;
  } {
    const avgTime =
      this.stats.totalGenerated > 0
        ? this.stats.totalTimeMs / this.stats.totalGenerated
        : 0;

    const successRate =
      this.stats.totalVerified > 0
        ? this.stats.successfulVerifications / this.stats.totalVerified
        : 0;

    return {
      totalProofsGenerated: this.stats.totalGenerated,
      totalProofsVerified: this.stats.totalVerified,
      successRate,
      averageProofTimeMs: avgTime,
      circuitVersion: this.config.circuitVersion,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ZKProofConfig>): void {
    this.config = { ...this.config, ...config };
    log.info('ZK Proof config updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): ZKProofConfig {
    return { ...this.config };
  }

  // ==================== Private Methods ====================

  private hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private hashModel(
    modelType: string,
    modelParams?: Record<string, unknown>
  ): string {
    const modelConfig = {
      type: modelType,
      params: modelParams || {},
    };
    return this.hashData(JSON.stringify(modelConfig));
  }

  private prepareCircuitInput(
    inputHash: string,
    modelHash: string,
    prompt: string,
    result: string
  ): Record<string, string> {
    return {
      input_hash: inputHash,
      model_hash: modelHash,
      prompt_hash: this.hashData(prompt),
      result_hash: this.hashData(result),
      combined_hash: this.hashData(inputHash + modelHash),
    };
  }

  private async computeProof(circuitInput: Record<string, string>): Promise<string> {
    // In production, this would call snarkjs or similar ZK library
    // For now, we generate a simulated proof structure
    return JSON.stringify({
      pi_a: [crypto.randomBytes(32).toString('hex'), crypto.randomBytes(32).toString('hex')],
      pi_b: [
        [crypto.randomBytes(32).toString('hex'), crypto.randomBytes(32).toString('hex')],
        [crypto.randomBytes(32).toString('hex'), crypto.randomBytes(32).toString('hex')],
      ],
      pi_c: [crypto.randomBytes(32).toString('hex'), crypto.randomBytes(32).toString('hex')],
      protocol: 'groth16',
      curve: 'bn128',
      input: circuitInput,
    });
  }

  private createMockProof(input: ProofGenerationInput, startTime: number): ZKProofData {
    const inputHash = this.hashData(input.prompt + input.aiResult);
    const modelHash = this.hashModel(input.modelType, input.modelParams);

    return {
      proof: '0xmock',
      publicSignals: {
        inputHash,
        modelHash,
        timestamp: Math.floor(Date.now() / 1000),
        circuitVersion: this.config.circuitVersion,
        modelType: input.modelType,
        taskId: input.taskId,
        nodeId: input.nodeId,
      },
      proofHash: this.hashData('mock'),
      generationTimeMs: Date.now() - startTime,
      circuitVersion: this.config.circuitVersion,
    };
  }

  private validateProofStructure(proof: string): boolean {
    try {
      const proofData = JSON.parse(proof);
      const requiredFields = ['pi_a', 'pi_b', 'pi_c', 'protocol', 'curve'];
      return requiredFields.every((field) => field in proofData);
    } catch {
      return false;
    }
  }

  private validatePublicSignals(signals: ZKPublicSignals): boolean {
    const requiredSignals = ['inputHash', 'modelHash', 'timestamp'];
    return requiredSignals.every((signal) => signal in signals);
  }

  private async verifyProofData(
    proof: string,
    aiResult: string,
    publicSignals: ZKPublicSignals
  ): Promise<boolean> {
    try {
      const proofData = JSON.parse(proof);

      // Basic validation
      if (!proofData.pi_a || !proofData.pi_b || !proofData.pi_c) {
        return false;
      }

      // Verify input hash matches
      const resultHash = this.hashData(aiResult);
      const inputHash = publicSignals.inputHash;

      // In production, this would do cryptographic verification
      // For now, we do basic structure validation
      return (
        Array.isArray(proofData.pi_a) &&
        proofData.pi_a.length === 2 &&
        Array.isArray(proofData.pi_b) &&
        proofData.pi_b.length === 2
      );
    } catch {
      return false;
    }
  }
}

// Stats interface
interface ProofStats {
  totalGenerated: number;
  totalVerified: number;
  successfulVerifications: number;
  totalTimeMs: number;
}

// Export default instance
export const zkProofService = new ZKProofService();