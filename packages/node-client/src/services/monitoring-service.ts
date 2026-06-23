import log from 'electron-log';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { BlockchainService, NodeStatus } from './blockchain-service';
import { TaskExecutionService, TaskExecutionState, TaskType, PoUETask } from './task-execution';
import { HardwareDetector, HardwareInfo } from './hardware-detector';

// Node status types
export enum NodeMonitorStatus {
  OFFLINE = 'OFFLINE',
  ONLINE = 'ONLINE',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR',
}

// Performance metrics
export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  timestamp: number;
}

// Earnings data
export interface EarningsData {
  totalEarnings: number;
  pendingEarnings: number;
  lastPayout: number;
  lastPayoutTime: string | null;
  earningsHistory: Array<{
    amount: number;
    timestamp: string;
    taskId: string;
  }>;
}

// Task history entry
export interface TaskHistoryEntry {
  id: string;
  taskType: TaskType;
  status: 'completed' | 'failed' | 'timeout';
  reward: number;
  executionTime: number;
  createdAt: string;
  completedAt: string;
  error?: string;
}

// Node status
export interface NodeStatusData {
  nodeId: string | null;
  status: NodeMonitorStatus;
  walletAddress: string | null;
  nodeType: string | null;
  region: string | null;
  uptime: number;
  lastHeartbeat: string | null;
  registeredAt: string | null;
}

// Performance history entry
export interface PerformanceHistoryEntry {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage: number;
}

// Monitoring configuration
interface MonitoringConfig {
  backendApiUrl: string;
  metricsPollingInterval: number; // ms
  heartbeatInterval: number; // ms
  maxPerformanceHistory: number;
  maxTaskHistory: number;
  maxEarningsHistory: number;
}

// Default configuration
const DEFAULT_CONFIG: MonitoringConfig = {
  backendApiUrl: process.env.BACKEND_API_URL || 'http://localhost:3000',
  metricsPollingInterval: 5000, // 5 seconds
  heartbeatInterval: 30000, // 30 seconds
  maxPerformanceHistory: 360, // 30 minutes of data (5s intervals)
  maxTaskHistory: 100,
  maxEarningsHistory: 50,
};

export class MonitoringService {
  private blockchainService: BlockchainService;
  private hardwareDetector: HardwareDetector;
  private taskExecutionService: TaskExecutionService | null = null;
  private config: MonitoringConfig;
  private statePath: string;
  
  // Current state
  private nodeStatus: NodeStatusData;
  private performanceMetrics: PerformanceMetrics;
  private earningsData: EarningsData;
  private taskHistory: TaskHistoryEntry[];
  private performanceHistory: PerformanceHistoryEntry[];
  
  // Timers
  private metricsTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config?: Partial<MonitoringConfig>) {
    this.blockchainService = new BlockchainService();
    this.hardwareDetector = new HardwareDetector();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.statePath = path.join(app.getPath('userData'), 'monitoring-data.json');
    
    // Initialize state
    this.nodeStatus = this.loadNodeStatus();
    this.performanceMetrics = this.getDefaultMetrics();
    this.earningsData = this.getDefaultEarnings();
    this.taskHistory = [];
    this.performanceHistory = [];
    
    // Load persisted data
    this.loadPersistedData();
  }

  /**
   * Set the task execution service reference
   */
  setTaskExecutionService(service: TaskExecutionService): void {
    this.taskExecutionService = service;
  }

  private getDefaultMetrics(): PerformanceMetrics {
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      gpuUsage: 0,
      diskUsage: 0,
      networkIn: 0,
      networkOut: 0,
      timestamp: Date.now(),
    };
  }

  private getDefaultEarnings(): EarningsData {
    return {
      totalEarnings: 0,
      pendingEarnings: 0,
      lastPayout: 0,
      lastPayoutTime: null,
      earningsHistory: [],
    };
  }

  private loadNodeStatus(): NodeStatusData {
    try {
      const statusPath = path.join(app.getPath('userData'), 'node-status.json');
      if (fs.existsSync(statusPath)) {
        const data = fs.readFileSync(statusPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      log.error('Error loading node status:', error);
    }
    return {
      nodeId: null,
      status: NodeMonitorStatus.OFFLINE,
      walletAddress: null,
      nodeType: null,
      region: null,
      uptime: 0,
      lastHeartbeat: null,
      registeredAt: null,
    };
  }

  private saveNodeStatus(): void {
    try {
      const statusPath = path.join(app.getPath('userData'), 'node-status.json');
      const dir = path.dirname(statusPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(statusPath, JSON.stringify(this.nodeStatus, null, 2));
    } catch (error) {
      log.error('Error saving node status:', error);
    }
  }

  private loadPersistedData(): void {
    try {
      if (fs.existsSync(this.statePath)) {
        const data = fs.readFileSync(this.statePath, 'utf-8');
        const parsed = JSON.parse(data);
        
        this.earningsData = parsed.earningsData || this.getDefaultEarnings();
        this.taskHistory = parsed.taskHistory || [];
        this.performanceHistory = parsed.performanceHistory || [];
      }
    } catch (error) {
      log.error('Error loading persisted monitoring data:', error);
    }
  }

  private savePersistedData(): void {
    try {
      const dir = path.dirname(this.statePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const data = {
        earningsData: this.earningsData,
        taskHistory: this.taskHistory,
        performanceHistory: this.performanceHistory,
      };
      
      fs.writeFileSync(this.statePath, JSON.stringify(data, null, 2));
    } catch (error) {
      log.error('Error saving monitoring data:', error);
    }
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.isRunning) {
      log.warn('Monitoring service is already running');
      return;
    }

    this.isRunning = true;
    log.info('Starting monitoring service...');

    // Start metrics polling
    this.metricsTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsPollingInterval);

    // Start heartbeat
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);

    // Initial collection
    this.collectMetrics();
    this.sendHeartbeat();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    log.info('Monitoring service stopped');
  }

  /**
   * Collect performance metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const hardwareInfo = await this.hardwareDetector.detect();
      
      this.performanceMetrics = {
        cpuUsage: hardwareInfo.cpu?.usage || 0,
        memoryUsage: hardwareInfo.memory?.usagePercent || 0,
        gpuUsage: hardwareInfo.gpu?.usage || 0,
        diskUsage: hardwareInfo.disk?.usagePercent || 0,
        networkIn: 0, // Would need system network stats
        networkOut: 0,
        timestamp: Date.now(),
      };

      // Add to performance history
      this.performanceHistory.push({
        timestamp: this.performanceMetrics.timestamp,
        cpuUsage: this.performanceMetrics.cpuUsage,
        memoryUsage: this.performanceMetrics.memoryUsage,
        gpuUsage: this.performanceMetrics.gpuUsage,
      });

      // Trim history
      if (this.performanceHistory.length > this.config.maxPerformanceHistory) {
        this.performanceHistory = this.performanceHistory.slice(-this.config.maxPerformanceHistory);
      }

      // Update node status based on task execution
      if (this.taskExecutionService) {
        const taskState = this.taskExecutionService.getState();
        if (taskState.status === 'PROCESSING' || taskState.status === 'SUBMITTING') {
          this.nodeStatus.status = NodeMonitorStatus.PROCESSING;
        } else if (this.nodeStatus.status !== NodeMonitorStatus.OFFLINE) {
          this.nodeStatus.status = NodeMonitorStatus.ONLINE;
        }
      }

      this.savePersistedData();
    } catch (error) {
      log.error('Error collecting metrics:', error);
    }
  }

  /**
   * Send heartbeat to backend
   */
  private async sendHeartbeat(): Promise<void> {
    if (!this.nodeStatus.nodeId) {
      return;
    }

    try {
      const response = await fetch(`${this.config.backendApiUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation NodeHeartbeat($nodeId: ID!, $status: String!, $metrics: NodeMetricsInput!) {
              nodeHeartbeat(nodeId: $nodeId, status: $status, metrics: $metrics) {
                success
              }
            }
          `,
          variables: {
            nodeId: this.nodeStatus.nodeId,
            status: this.nodeStatus.status,
            metrics: {
              cpuUsage: this.performanceMetrics.cpuUsage,
              memoryUsage: this.performanceMetrics.memoryUsage,
              gpuUsage: this.performanceMetrics.gpuUsage,
              diskUsage: this.performanceMetrics.diskUsage,
            },
          },
        }),
      });

      if (response.ok) {
        this.nodeStatus.lastHeartbeat = new Date().toISOString();
        this.saveNodeStatus();
      }
    } catch (error) {
      // Heartbeat failures are common, don't log as error
      log.debug('Heartbeat failed:', error);
    }
  }

  /**
   * Update node status
   */
  updateNodeStatus(status: Partial<NodeStatusData>): void {
    this.nodeStatus = { ...this.nodeStatus, ...status };
    this.saveNodeStatus();
  }

  /**
   * Add task to history
   */
  addTaskToHistory(entry: TaskHistoryEntry): void {
    this.taskHistory.unshift(entry);
    
    // Update earnings
    if (entry.status === 'completed' && entry.reward > 0) {
      this.earningsData.totalEarnings += entry.reward;
      this.earningsData.pendingEarnings += entry.reward;
      this.earningsData.earningsHistory.unshift({
        amount: entry.reward,
        timestamp: entry.completedAt,
        taskId: entry.id,
      });

      // Trim earnings history
      if (this.earningsData.earningsHistory.length > this.config.maxEarningsHistory) {
        this.earningsData.earningsHistory = this.earningsData.earningsHistory.slice(0, this.config.maxEarningsHistory);
      }
    }

    // Trim task history
    if (this.taskHistory.length > this.config.maxTaskHistory) {
      this.taskHistory = this.taskHistory.slice(0, this.config.maxTaskHistory);
    }

    this.savePersistedData();
  }

  /**
   * Get current node status
   */
  getNodeStatus(): NodeStatusData {
    return { ...this.nodeStatus };
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get earnings data
   */
  getEarningsData(): EarningsData {
    return { ...this.earningsData };
  }

  /**
   * Get task history
   */
  getTaskHistory(): TaskHistoryEntry[] {
    return [...this.taskHistory];
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(): PerformanceHistoryEntry[] {
    return [...this.performanceHistory];
  }

  /**
   * Get all monitoring data
   */
  getAllData(): {
    nodeStatus: NodeStatusData;
    performanceMetrics: PerformanceMetrics;
    earningsData: EarningsData;
    taskHistory: TaskHistoryEntry[];
    performanceHistory: PerformanceHistoryEntry[];
  } {
    return {
      nodeStatus: this.getNodeStatus(),
      performanceMetrics: this.getPerformanceMetrics(),
      earningsData: this.getEarningsData(),
      taskHistory: this.getTaskHistory(),
      performanceHistory: this.getPerformanceHistory(),
    };
  }

  /**
   * Fetch latest data from backend
   */
  async syncWithBackend(): Promise<void> {
    if (!this.nodeStatus.nodeId) {
      return;
    }

    try {
      const response = await fetch(`${this.config.backendApiUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetNodeStats($nodeId: ID!) {
              nodeStats(nodeId: $nodeId) {
                totalEarnings
                pendingEarnings
                lastPayout
                lastPayoutTime
                taskCount
                successRate
                averageExecutionTime
              }
            }
          `,
          variables: {
            nodeId: this.nodeStatus.nodeId,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.nodeStats) {
          const stats = data.data.nodeStats;
          this.earningsData.totalEarnings = stats.totalEarnings || this.earningsData.totalEarnings;
          this.earningsData.pendingEarnings = stats.pendingEarnings || this.earningsData.pendingEarnings;
          this.earningsData.lastPayout = stats.lastPayout || this.earningsData.lastPayout;
          this.earningsData.lastPayoutTime = stats.lastPayoutTime || this.earningsData.lastPayoutTime;
          this.savePersistedData();
        }
      }
    } catch (error) {
      log.debug('Failed to sync with backend:', error);
    }
  }

  /**
   * Claim pending earnings
   */
  async claimEarnings(): Promise<boolean> {
    if (!this.nodeStatus.nodeId || this.earningsData.pendingEarnings <= 0) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.backendApiUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation ClaimEarnings($nodeId: ID!) {
              claimEarnings(nodeId: $nodeId) {
                success
                transactionHash
                amount
              }
            }
          `,
          variables: {
            nodeId: this.nodeStatus.nodeId,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.claimEarnings?.success) {
          this.earningsData.lastPayout = this.earningsData.pendingEarnings;
          this.earningsData.lastPayoutTime = new Date().toISOString();
          this.earningsData.pendingEarnings = 0;
          this.savePersistedData();
          return true;
        }
      }
    } catch (error) {
      log.error('Error claiming earnings:', error);
    }

    return false;
  }

  /**
   * Reset monitoring data
   */
  resetData(): void {
    this.earningsData = this.getDefaultEarnings();
    this.taskHistory = [];
    this.performanceHistory = [];
    this.savePersistedData();
  }

  /**
   * Check if monitoring is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}