import log from 'electron-log';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { BlockchainService, NodeStatus } from './blockchain-service';
import { ModelManager, ModelStatus } from './model-manager';
import { HardwareDetector, HardwareInfo } from './hardware-detector';
import { ZKProofService, ZKProofData } from './zk-proof-service';

// Task types for PoUE
export enum TaskType {
  EMOTIONAL_ANALYSIS = 'EMOTIONAL_ANALYSIS',
  EMOTIONAL_RESPONSE = 'EMOTIONAL_RESPONSE',
  EMOTIONAL_CONSENSUS = 'EMOTIONAL_CONSENSUS',
  KNOWLEDGE_QUERY = 'KNOWLEDGE_QUERY',
  CONTENT_MODERATION = 'CONTENT_MODERATION',
  TEXT_GENERATION = 'TEXT_GENERATION',
  SUMMARIZATION = 'SUMMARIZATION',
  TRANSLATION = 'TRANSLATION',
}

// Task status
export enum TaskExecutionStatus {
  IDLE = 'IDLE',
  FETCHING = 'FETCHING',
  PROCESSING = 'PROCESSING',
  SUBMITTING = 'SUBMITTING',
  ERROR = 'ERROR',
}

// Task from backend
export interface PoUETask {
  id: string;
  taskType: TaskType;
  prompt: string;
  parameters?: Record<string, any>;
  timeout: number;
  reward: number;
  createdAt: string;
}

// Task result
export interface TaskResult {
  taskId: string;
  nodeId: string;
  result: string;
  executionTime: number;
  modelUsed: string;
  zkProof?: string;
  error?: string;
}

// Task execution state
export interface TaskExecutionState {
  status: TaskExecutionStatus;
  currentTask: PoUETask | null;
  lastTaskId: string | null;
  lastError: string | null;
  totalTasksProcessed: number;
  totalEarnings: number;
  lastExecutionTime: number;
}

// AI inference result
export interface AIInferenceResult {
  success: boolean;
  output: string;
  model: string;
  tokensUsed?: number;
  latency?: number;
  error?: string;
}

// Configuration
interface TaskExecutionConfig {
  backendApiUrl: string;
  pollingInterval: number; // ms
  maxRetries: number;
  defaultTimeout: number; // ms
  enableLocalModel: boolean;
  localModelEndpoint: string;
  cloudModelEndpoint: string;
  cloudApiKey: string;
}

// Default configuration
const DEFAULT_CONFIG: TaskExecutionConfig = {
  backendApiUrl: process.env.BACKEND_API_URL || 'http://localhost:3000',
  pollingInterval: 10000, // 10 seconds
  maxRetries: 3,
  defaultTimeout: 60000, // 60 seconds
  enableLocalModel: true,
  localModelEndpoint: process.env.LOCAL_MODEL_ENDPOINT || 'http://localhost:11434',
  cloudModelEndpoint: process.env.CLOUD_MODEL_ENDPOINT || 'https://api.openai.com/v1',
  cloudApiKey: process.env.CLOUD_API_KEY || '',
};

export class TaskExecutionService {
  private blockchainService: BlockchainService;
  private modelManager: ModelManager;
  private hardwareDetector: HardwareDetector;
  private zkProofService: ZKProofService;
  private config: TaskExecutionConfig;
  private statePath: string;
  private state: TaskExecutionState;
  private pollingTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private nodeId: string | null = null;

  constructor(config?: Partial<TaskExecutionConfig>) {
    this.blockchainService = new BlockchainService();
    this.modelManager = new ModelManager();
    this.hardwareDetector = new HardwareDetector();
    this.zkProofService = new ZKProofService();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.statePath = path.join(app.getPath('userData'), 'task-execution-state.json');
    this.state = this.loadState();
  }

  private loadState(): TaskExecutionState {
    try {
      if (fs.existsSync(this.statePath)) {
        const data = fs.readFileSync(this.statePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      log.error('Error loading task execution state:', error);
    }
    return {
      status: TaskExecutionStatus.IDLE,
      currentTask: null,
      lastTaskId: null,
      lastError: null,
      totalTasksProcessed: 0,
      totalEarnings: 0,
      lastExecutionTime: 0,
    };
  }

  private saveState(): void {
    try {
      const dir = path.dirname(this.statePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      log.error('Error saving task execution state:', error);
    }
  }

  /**
   * Set the node ID for this client
   */
  setNodeId(nodeId: string): void {
    this.nodeId = nodeId;
    log.info(`Task execution service initialized with node ID: ${nodeId}`);
  }

  /**
   * Get the node ID
   */
  getNodeId(): string | null {
    return this.nodeId;
  }

  /**
   * Start task polling
   */
  start(): void {
    if (this.isRunning) {
      log.warn('Task execution service is already running');
      return;
    }

    this.isRunning = true;
    this.state.status = TaskExecutionStatus.IDLE;
    this.saveState();

    log.info('Starting task execution service...');
    this.pollTasks();
  }

  /**
   * Stop task polling
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }

    this.state.status = TaskExecutionStatus.IDLE;
    this.saveState();

    log.info('Task execution service stopped');
  }

  /**
   * Poll for tasks from backend
   */
  private async pollTasks(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      this.state.status = TaskExecutionStatus.FETCHING;
      this.saveState();

      const task = await this.fetchTask();

      if (task) {
        log.info(`Received task: ${task.id} (${task.taskType})`);
        await this.executeTask(task);
      }
    } catch (error) {
      log.error('Error polling for tasks:', error);
      this.state.lastError = (error as Error).message;
      this.state.status = TaskExecutionStatus.ERROR;
      this.saveState();
    }

    // Schedule next poll
    if (this.isRunning) {
      this.pollingTimer = setTimeout(() => this.pollTasks(), this.config.pollingInterval);
    }
  }

  /**
   * Fetch a task from the backend
   */
  private async fetchTask(): Promise<PoUETask | null> {
    if (!this.nodeId) {
      log.warn('Node ID not set, cannot fetch tasks');
      return null;
    }

    try {
      const response = await fetch(`${this.config.backendApiUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetNodeTask($nodeId: ID!) {
              nodeTask(nodeId: $nodeId) {
                id
                taskType
                prompt
                parameters
                timeout
                reward
                createdAt
              }
            }
          `,
          variables: {
            nodeId: this.nodeId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        log.error('GraphQL errors:', data.errors);
        return null;
      }

      return data.data?.nodeTask || null;
    } catch (error) {
      // Network errors are common, don't log as error
      if ((error as Error).message.includes('fetch')) {
        log.debug('Backend not reachable, will retry...');
      } else {
        log.error('Error fetching task:', error);
      }
      return null;
    }
  }

  /**
   * Execute a task
   */
  private async executeTask(task: PoUETask): Promise<void> {
    this.state.currentTask = task;
    this.state.status = TaskExecutionStatus.PROCESSING;
    this.state.lastError = null;
    this.saveState();

    const startTime = Date.now();

    try {
      log.info(`Executing task ${task.id} of type ${task.taskType}`);

      // Route to appropriate handler based on task type
      let result: string;

      switch (task.taskType) {
        case TaskType.EMOTIONAL_ANALYSIS:
          result = await this.handleEmotionalAnalysis(task);
          break;
        case TaskType.EMOTIONAL_RESPONSE:
          result = await this.handleEmotionalResponse(task);
          break;
        case TaskType.EMOTIONAL_CONSENSUS:
          result = await this.handleEmotionalConsensus(task);
          break;
        case TaskType.KNOWLEDGE_QUERY:
          result = await this.handleKnowledgeQuery(task);
          break;
        case TaskType.CONTENT_MODERATION:
          result = await this.handleContentModeration(task);
          break;
        case TaskType.TEXT_GENERATION:
          result = await this.handleTextGeneration(task);
          break;
        case TaskType.SUMMARIZATION:
          result = await this.handleSummarization(task);
          break;
        case TaskType.TRANSLATION:
          result = await this.handleTranslation(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.taskType}`);
      }

      const executionTime = Date.now() - startTime;
      this.state.lastExecutionTime = executionTime;

      // Submit result
      await this.submitResult(task, result, executionTime);

      this.state.totalTasksProcessed++;
      this.state.status = TaskExecutionStatus.IDLE;
      this.state.currentTask = null;
      this.saveState();

      log.info(`Task ${task.id} completed in ${executionTime}ms`);
    } catch (error) {
      log.error(`Error executing task ${task.id}:`, error);
      
      this.state.lastError = (error as Error).message;
      this.state.status = TaskExecutionStatus.ERROR;
      this.saveState();

      // Submit error result
      await this.submitError(task, (error as Error).message);
    }
  }

  /**
   * Handle emotional analysis task
   */
  private async handleEmotionalAnalysis(task: PoUETask): Promise<string> {
    const prompt = task.prompt;
    const inference = await this.performInference(prompt, 'emotional_analysis');
    
    if (!inference.success) {
      throw new Error(inference.error || 'Inference failed');
    }

    // Parse and format the emotional analysis result
    return JSON.stringify({
      type: 'emotional_analysis',
      input: prompt,
      result: inference.output,
      model: inference.model,
    });
  }

  /**
   * Handle emotional response task
   */
  private async handleEmotionalResponse(task: PoUETask): Promise<string> {
    const params = task.parameters || {};
    const prompt = `Generate an emotionally intelligent response.\nUser's message: ${task.prompt}\nUser's emotion: ${params.userEmotion || 'neutral'}\nTone: ${params.tone || 'empathetic'}`;
    
    const inference = await this.performInference(prompt, 'emotional_response');
    
    if (!inference.success) {
      throw new Error(inference.error || 'Inference failed');
    }

    return JSON.stringify({
      type: 'emotional_response',
      input: task.prompt,
      result: inference.output,
      model: inference.model,
    });
  }

  /**
   * Handle emotional consensus task (PoUE core)
   */
  private async handleEmotionalConsensus(task: PoUETask): Promise<string> {
    const params = task.parameters || {};
    const inputs = params.inputs || [task.prompt];
    
    // Analyze each input
    const analyses = await Promise.all(
      inputs.map(async (input: string) => {
        const inference = await this.performInference(
          `Analyze the emotional content of: ${input}`,
          'emotional_analysis'
        );
        return {
          input,
          analysis: inference.success ? inference.output : 'Analysis failed',
        };
      })
    );

    // Calculate consensus
    const consensusPrompt = `Given these emotional analyses: ${JSON.stringify(analyses)}\nCalculate the emotional consensus score (0-1) and determine if consensus is valid (threshold 0.7).`;
    const consensusInference = await this.performInference(consensusPrompt, 'emotional_consensus');

    return JSON.stringify({
      type: 'emotional_consensus',
      inputs,
      analyses,
      consensus: consensusInference.success ? consensusInference.output : 'Consensus calculation failed',
      model: consensusInference.model,
    });
  }

  /**
   * Handle knowledge query task
   */
  private async handleKnowledgeQuery(task: PoUETask): Promise<string> {
    const prompt = `Answer the following question based on knowledge base:\n${task.prompt}`;
    const inference = await this.performInference(prompt, 'knowledge_query');
    
    if (!inference.success) {
      throw new Error(inference.error || 'Inference failed');
    }

    return JSON.stringify({
      type: 'knowledge_query',
      question: task.prompt,
      answer: inference.output,
      model: inference.model,
    });
  }

  /**
   * Handle content moderation task
   */
  private async handleContentModeration(task: PoUETask): Promise<string> {
    const prompt = `Analyze the following content for safety and moderation. Check for: violence, hate speech, sexual content, self-harm, illegal content.\nContent: ${task.prompt}`;
    const inference = await this.performInference(prompt, 'content_moderation');
    
    if (!inference.success) {
      throw new Error(inference.error || 'Inference failed');
    }

    return JSON.stringify({
      type: 'content_moderation',
      content: task.prompt,
      moderationResult: inference.output,
      model: inference.model,
    });
  }

  /**
   * Handle text generation task
   */
  private async handleTextGeneration(task: PoUETask): Promise<string> {
    const params = task.parameters || {};
    const prompt = `${task.prompt}\n${params.additionalInstructions || ''}`;
    
    const inference = await this.performInference(prompt, 'text_generation', {
      maxTokens: params.maxTokens || 1000,
      temperature: params.temperature || 0.7,
    });
    
    if (!inference.success) {
      throw new Error(inference.error || 'Inference failed');
    }

    return JSON.stringify({
      type: 'text_generation',
      prompt: task.prompt,
      generatedText: inference.output,
      model: inference.model,
      tokensUsed: inference.tokensUsed,
    });
  }

  /**
   * Handle summarization task
   */
  private async handleSummarization(task: PoUETask): Promise<string> {
    const params = task.parameters || {};
    const prompt = `Summarize the following text${params.maxLength ? ` in ${params.maxLength} words` : ''}:\n${task.prompt}`;
    const inference = await this.performInference(prompt, 'summarization');
    
    if (!inference.success) {
      throw new Error(inference.error || 'Inference failed');
    }

    return JSON.stringify({
      type: 'summarization',
      originalText: task.prompt,
      summary: inference.output,
      model: inference.model,
    });
  }

  /**
   * Handle translation task
   */
  private async handleTranslation(task: PoUETask): Promise<string> {
    const params = task.parameters || {};
    const targetLang = params.targetLanguage || 'en';
    const prompt = `Translate the following text to ${targetLang}:\n${task.prompt}`;
    const inference = await this.performInference(prompt, 'translation');
    
    if (!inference.success) {
      throw new Error(inference.error || 'Inference failed');
    }

    return JSON.stringify({
      type: 'translation',
      originalText: task.prompt,
      translatedText: inference.output,
      targetLanguage: targetLang,
      model: inference.model,
    });
  }

  /**
   * Perform AI inference using local or cloud model
   */
  private async performInference(
    prompt: string,
    taskType: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<AIInferenceResult> {
    const startTime = Date.now();

    // Try local model first if enabled
    if (this.config.enableLocalModel) {
      try {
        const localResult = await this.performLocalInference(prompt, taskType, options);
        if (localResult.success) {
          return {
            ...localResult,
            latency: Date.now() - startTime,
          };
        }
      } catch (error) {
        log.debug('Local model inference failed, trying cloud:', error);
      }
    }

    // Fall back to cloud model
    return this.performCloudInference(prompt, taskType, options);
  }

  /**
   * Perform inference using local Ollama model
   */
  private async performLocalInference(
    prompt: string,
    taskType: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<AIInferenceResult> {
    // Map task types to local models
    const modelMap: Record<string, string> = {
      emotional_analysis: 'llama3:8b',
      emotional_response: 'llama3:8b',
      emotional_consensus: 'llama3:70b',
      knowledge_query: 'llama3:70b',
      content_moderation: 'llama3:8b',
      text_generation: 'llama3:70b',
      summarization: 'llama3:8b',
      translation: 'llama3:8b',
    };

    const model = modelMap[taskType] || 'llama3:8b';

    try {
      const response = await fetch(`${this.config.localModelEndpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            num_predict: options?.maxTokens || 500,
            temperature: options?.temperature || 0.7,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Local model error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        output: data.response,
        model: `local:${model}`,
        tokensUsed: data.eval_count,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        model: `local:${model}`,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Perform inference using cloud API (OpenAI-compatible)
   */
  private async performCloudInference(
    prompt: string,
    taskType: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<AIInferenceResult> {
    // Map task types to cloud models
    const modelMap: Record<string, string> = {
      emotional_analysis: 'gpt-4o',
      emotional_response: 'gpt-4o',
      emotional_consensus: 'gpt-4o',
      knowledge_query: 'gpt-4o',
      content_moderation: 'gpt-4o',
      text_generation: 'gpt-4o',
      summarization: 'gpt-4o',
      translation: 'gpt-4o',
    };

    const model = modelMap[taskType] || 'gpt-4o';

    try {
      const response = await fetch(`${this.config.cloudModelEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.cloudApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options?.maxTokens || 500,
          temperature: options?.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Cloud API error: ${response.status}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      
      return {
        success: true,
        output: choice?.message?.content || '',
        model: `cloud:${model}`,
        tokensUsed: data.usage?.total_tokens,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        model: `cloud:${model}`,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Submit task result to backend
   */
  private async submitResult(task: PoUETask, result: string, executionTime: number): Promise<void> {
    if (!this.nodeId) {
      throw new Error('Node ID not set');
    }

    this.state.status = TaskExecutionStatus.SUBMITTING;
    this.saveState();

    try {
      // Generate ZK proof for the AI result
      let zkProof: ZKProofData | null = null;
      try {
        zkProof = await this.zkProofService.generateProof({
          prompt: task.prompt,
          aiResult: result,
          modelType: 'llama3-8b', // Could be dynamic based on actual model used
          taskId: task.id,
          nodeId: this.nodeId,
        });
        log.info(`ZK proof generated for task ${task.id}: ${zkProof.proofHash}`);
      } catch (proofError) {
        log.error('Error generating ZK proof, continuing without proof:', proofError);
      }

      const response = await fetch(`${this.config.backendApiUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation SubmitTaskResult($input: SubmitTaskResultInput!) {
              submitTaskResult(input: $input) {
                id
                status
                reward
              }
            }
          `,
          variables: {
            input: {
              taskId: task.id,
              nodeId: this.nodeId,
              result,
              executionTime,
              modelUsed: 'llama3-8b',
              zkProof: zkProof ? JSON.stringify(zkProof.proof) : null,
              zkProofPublicSignals: zkProof ? zkProof.publicSignals : null,
              zkProofHash: zkProof ? zkProof.proofHash : null,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit result: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.data?.submitTaskResult?.reward) {
        this.state.totalEarnings += data.data.submitTaskResult.reward;
      }

      log.info(`Task result submitted for ${task.id}, reward: ${data.data?.submitTaskResult?.reward || 0}`);
    } catch (error) {
      log.error('Error submitting task result:', error);
      // Try to submit via blockchain as fallback
      await this.submitResultToBlockchain(task, result);
    }
  }

  /**
   * Submit error result to backend
   */
  private async submitError(task: PoUETask, error: string): Promise<void> {
    if (!this.nodeId) {
      return;
    }

    try {
      await fetch(`${this.config.backendApiUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation SubmitTaskError($taskId: ID!, $nodeId: ID!, $error: String!) {
              submitTaskError(taskId: $taskId, nodeId: $nodeId, error: $error) {
                success
              }
            }
          `,
          variables: {
            taskId: task.id,
            nodeId: this.nodeId,
            error,
          },
        }),
      });
    } catch (error) {
      log.error('Error submitting task error:', error);
    }
  }

  /**
   * Submit result to blockchain as fallback
   */
  private async submitResultToBlockchain(task: PoUETask, result: string): Promise<void> {
    if (!this.nodeId) {
      throw new Error('Node ID not set');
    }

    try {
      // Generate a mock proof (in production, this would be a real ZK proof)
      const mockProof = `0x${Buffer.from(`proof_${Date.now()}_${task.id}`).toString('hex')}`;
      
      await this.blockchainService.submitTaskResult(
        this.nodeId,
        task.id,
        result,
        mockProof
      );

      log.info(`Task result submitted to blockchain for ${task.id}`);
    } catch (error) {
      log.error('Error submitting to blockchain:', error);
    }
  }

  /**
   * Get current execution state
   */
  getState(): TaskExecutionState {
    return { ...this.state };
  }

  /**
   * Check if service is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get available local models
   */
  async getAvailableModels(): Promise<ModelStatus[]> {
    return this.modelManager.getDownloadedModels();
  }

  /**
   * Get hardware info
   */
  async getHardwareInfo(): Promise<HardwareInfo> {
    return this.hardwareDetector.detect();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TaskExecutionConfig>): void {
    this.config = { ...this.config, ...config };
    log.info('Task execution config updated');
  }

  /**
   * Get configuration
   */
  getConfig(): TaskExecutionConfig {
    return { ...this.config };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.state.totalTasksProcessed = 0;
    this.state.totalEarnings = 0;
    this.state.lastExecutionTime = 0;
    this.saveState();
  }
}