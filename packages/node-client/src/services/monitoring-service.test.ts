import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MonitoringService, NodeMonitorStatus } from './monitoring-service';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/test-user-data',
  },
}));

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: () => false,
    readFileSync: () => {
      throw new Error('File not found');
    },
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
  existsSync: () => false,
  readFileSync: () => {
    throw new Error('File not found');
  },
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock blockchain-service
vi.mock('./blockchain-service', () => ({
  BlockchainService: vi.fn().mockImplementation(() => ({})),
  NodeStatus: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    PENALTY: 'PENALTY',
  },
}));

// Mock task-execution
vi.mock('./task-execution', () => ({
  TaskExecutionService: vi.fn().mockImplementation(() => ({
    getState: () => ({
      status: 'IDLE',
      currentTask: null,
      lastTaskId: null,
      lastError: null,
      totalTasksProcessed: 0,
      totalEarnings: 0,
      lastExecutionTime: 0,
    }),
  })),
  TaskExecutionState: {},
  TaskType: {
    EMOTIONAL_ANALYSIS: 'EMOTIONAL_ANALYSIS',
    EMOTIONAL_RESPONSE: 'EMOTIONAL_RESPONSE',
    EMOTIONAL_CONSENSUS: 'EMOTIONAL_CONSENSUS',
    KNOWLEDGE_QUERY: 'KNOWLEDGE_QUERY',
    CONTENT_MODERATION: 'CONTENT_MODERATION',
    TEXT_GENERATION: 'TEXT_GENERATION',
    SUMMARIZATION: 'SUMMARIZATION',
    TRANSLATION: 'TRANSLATION',
  },
  PoUETask: {},
}));

// Mock hardware-detector
vi.mock('./hardware-detector', () => ({
  HardwareDetector: vi.fn().mockImplementation(() => ({
    detect: vi.fn().mockResolvedValue({
      platform: 'test',
      cpu: { model: 'Test CPU', cores: 8, usage: 50 },
      memory: { total: 32 * 1024 * 1024 * 1024, available: 16 * 1024 * 1024 * 1024, usagePercent: 50 },
      gpu: [{ name: 'Test GPU', memory: 10240, usage: 50 }],
      disk: { total: 1024 * 1024 * 1024 * 1024, available: 500 * 1024 * 1024 * 1024, usagePercent: 50 },
    }),
  })),
  HardwareInfo: {},
}));

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;

  beforeEach(() => {
    monitoringService = new MonitoringService();
  });

  describe('getNodeStatus', () => {
    it('should return default node status when not initialized', () => {
      const status = monitoringService.getNodeStatus();
      
      expect(status.nodeId).toBeNull();
      expect(status.status).toBe(NodeMonitorStatus.OFFLINE);
      expect(status.walletAddress).toBeNull();
      expect(status.nodeType).toBeNull();
      expect(status.region).toBeNull();
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return default metrics with zero values', () => {
      const metrics = monitoringService.getPerformanceMetrics();
      
      expect(metrics.cpuUsage).toBe(0);
      expect(metrics.memoryUsage).toBe(0);
      expect(metrics.gpuUsage).toBe(0);
      expect(metrics.diskUsage).toBe(0);
      expect(metrics.networkIn).toBe(0);
      expect(metrics.networkOut).toBe(0);
      expect(metrics.timestamp).toBeGreaterThan(0);
    });
  });

  describe('getEarningsData', () => {
    it('should return default earnings data', () => {
      const earnings = monitoringService.getEarningsData();
      
      expect(earnings.totalEarnings).toBe(0);
      expect(earnings.pendingEarnings).toBe(0);
      expect(earnings.lastPayout).toBe(0);
      expect(earnings.lastPayoutTime).toBeNull();
      expect(earnings.earningsHistory).toEqual([]);
    });
  });

  describe('getTaskHistory', () => {
    it('should return empty task history initially', () => {
      const history = monitoringService.getTaskHistory();
      
      expect(history).toEqual([]);
    });
  });

  describe('getPerformanceHistory', () => {
    it('should return empty performance history initially', () => {
      const history = monitoringService.getPerformanceHistory();
      
      expect(history).toEqual([]);
    });
  });

  describe('updateNodeStatus', () => {
    it('should update node status with provided values', () => {
      monitoringService.updateNodeStatus({
        nodeId: 'test-node-123',
        walletAddress: '0x1234567890123456789012345678901234567890',
        nodeType: 'CORE',
        region: 'us-east-1',
      });

      const status = monitoringService.getNodeStatus();
      
      expect(status.nodeId).toBe('test-node-123');
      expect(status.walletAddress).toBe('0x1234567890123456789012345678901234567890');
      expect(status.nodeType).toBe('CORE');
      expect(status.region).toBe('us-east-1');
    });
  });

  describe('addTaskToHistory', () => {
    it('should add completed task to history and update earnings', () => {
      const taskEntry = {
        id: 'task-123',
        taskType: 'EMOTIONAL_ANALYSIS' as any,
        status: 'completed' as const,
        reward: 100,
        executionTime: 5000,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      monitoringService.addTaskToHistory(taskEntry);

      const history = monitoringService.getTaskHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('task-123');

      const earnings = monitoringService.getEarningsData();
      expect(earnings.totalEarnings).toBe(100);
      expect(earnings.pendingEarnings).toBe(100);
    });

    it('should not update earnings for failed tasks', () => {
      const taskEntry = {
        id: 'task-456',
        taskType: 'TEXT_GENERATION' as any,
        status: 'failed' as const,
        reward: 0,
        executionTime: 3000,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        error: 'Timeout',
      };

      monitoringService.addTaskToHistory(taskEntry);

      const history = monitoringService.getTaskHistory();
      expect(history).toHaveLength(1);

      const earnings = monitoringService.getEarningsData();
      expect(earnings.totalEarnings).toBe(0);
    });
  });

  describe('getAllData', () => {
    it('should return all monitoring data', () => {
      const allData = monitoringService.getAllData();

      expect(allData).toHaveProperty('nodeStatus');
      expect(allData).toHaveProperty('performanceMetrics');
      expect(allData).toHaveProperty('earningsData');
      expect(allData).toHaveProperty('taskHistory');
      expect(allData).toHaveProperty('performanceHistory');
    });
  });

  describe('isActive', () => {
    it('should return false initially', () => {
      expect(monitoringService.isActive()).toBe(false);
    });
  });

  describe('resetData', () => {
    it('should reset all data to defaults', () => {
      // Add some data first
      monitoringService.updateNodeStatus({
        nodeId: 'test-node',
        walletAddress: '0x123',
      });

      monitoringService.addTaskToHistory({
        id: 'task-1',
        taskType: 'EMOTIONAL_ANALYSIS' as any,
        status: 'completed' as const,
        reward: 100,
        executionTime: 1000,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      // Reset
      monitoringService.resetData();

      // Verify reset
      const earnings = monitoringService.getEarningsData();
      expect(earnings.totalEarnings).toBe(0);
      expect(earnings.pendingEarnings).toBe(0);

      const history = monitoringService.getTaskHistory();
      expect(history).toEqual([]);
    });
  });
});