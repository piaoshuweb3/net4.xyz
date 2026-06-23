import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TaskExecutionService, TaskType, TaskExecutionStatus } from './task-execution';

// Mock dependencies
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/test-user-data'),
  },
}));

vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('./blockchain-service', () => ({
  BlockchainService: vi.fn().mockImplementation(() => ({
    submitTaskResult: vi.fn().mockResolvedValue({ transactionHash: '0x123' }),
  })),
  NodeStatus: {
    ACTIVE: 'ACTIVE',
  },
}));

vi.mock('./model-manager', () => ({
  ModelManager: vi.fn().mockImplementation(() => ({
    getDownloadedModels: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('./hardware-detector', () => ({
  HardwareDetector: vi.fn().mockImplementation(() => ({
    detect: vi.fn().mockResolvedValue({
      platform: 'linux',
      arch: 'x64',
      cpu: { model: 'Intel i9', cores: 8, speed: 3.6, manufacturer: 'Intel' },
      memory: { total: 32 * 1024 * 1024 * 1024, available: 16 * 1024 * 1024 * 1024, used: 16 * 1024 * 1024 * 1024 },
      gpu: [{ name: 'NVIDIA RTX 3080', memory: 10240, vendor: 'NVIDIA' }],
      disk: { total: 1024 * 1024 * 1024 * 1024, available: 500 * 1024 * 1024 * 1024 },
      network: { ip: '192.168.1.100', type: 'wired' },
    }),
  })),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TaskExecutionService', () => {
  let service: TaskExecutionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TaskExecutionService({
      backendApiUrl: 'http://localhost:3000',
      pollingInterval: 1000,
      enableLocalModel: false,
      cloudApiKey: 'test-key',
    });
  });

  afterEach(() => {
    service.stop();
  });

  describe('initialization', () => {
    it('should create service with default config', () => {
      expect(service).toBeDefined();
    });

    it('should set node ID', () => {
      service.setNodeId('test-node-123');
      const state = service.getState();
      expect(state).toBeDefined();
    });

    it('should start and stop correctly', () => {
      service.setNodeId('test-node-123');
      service.start();
      expect(service.isActive()).toBe(true);
      
      service.stop();
      expect(service.isActive()).toBe(false);
    });
  });

  describe('task execution state', () => {
    it('should return initial state', () => {
      const state = service.getState();
      
      expect(state.status).toBe(TaskExecutionStatus.IDLE);
      expect(state.currentTask).toBeNull();
      expect(state.totalTasksProcessed).toBe(0);
      expect(state.totalEarnings).toBe(0);
    });

    it('should reset statistics', () => {
      service.resetStats();
      const state = service.getState();
      
      expect(state.totalTasksProcessed).toBe(0);
      expect(state.totalEarnings).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      service.updateConfig({
        pollingInterval: 5000,
        maxRetries: 5,
      });
      
      const config = service.getConfig();
      expect(config.pollingInterval).toBe(5000);
      expect(config.maxRetries).toBe(5);
    });

    it('should preserve existing config when updating', () => {
      service.updateConfig({ pollingInterval: 5000 });
      
      const config = service.getConfig();
      expect(config.backendApiUrl).toBe('http://localhost:3000');
      expect(config.enableLocalModel).toBe(false);
    });
  });

  describe('task type handling', () => {
    it('should have all task types defined', () => {
      expect(TaskType.EMOTIONAL_ANALYSIS).toBe('EMOTIONAL_ANALYSIS');
      expect(TaskType.EMOTIONAL_RESPONSE).toBe('EMOTIONAL_RESPONSE');
      expect(TaskType.EMOTIONAL_CONSENSUS).toBe('EMOTIONAL_CONSENSUS');
      expect(TaskType.KNOWLEDGE_QUERY).toBe('KNOWLEDGE_QUERY');
      expect(TaskType.CONTENT_MODERATION).toBe('CONTENT_MODERATION');
      expect(TaskType.TEXT_GENERATION).toBe('TEXT_GENERATION');
      expect(TaskType.SUMMARIZATION).toBe('SUMMARIZATION');
      expect(TaskType.TRANSLATION).toBe('TRANSLATION');
    });
  });

  describe('hardware info', () => {
    it('should get hardware info', async () => {
      const info = await service.getHardwareInfo();
      
      expect(info).toBeDefined();
      expect(info.cpu).toBeDefined();
      expect(info.memory).toBeDefined();
    });
  });

  describe('available models', () => {
    it('should get available models', async () => {
      const models = await service.getAvailableModels();
      
      expect(Array.isArray(models)).toBe(true);
    });
  });
});

describe('TaskExecutionStatus', () => {
  it('should have all status values', () => {
    expect(TaskExecutionStatus.IDLE).toBe('IDLE');
    expect(TaskExecutionStatus.FETCHING).toBe('FETCHING');
    expect(TaskExecutionStatus.PROCESSING).toBe('PROCESSING');
    expect(TaskExecutionStatus.SUBMITTING).toBe('SUBMITTING');
    expect(TaskExecutionStatus.ERROR).toBe('ERROR');
  });
});