import log from 'electron-log';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { BlockchainService } from './blockchain-service';
import { MonitoringService, NodeMonitorStatus } from './monitoring-service';

/**
 * 惩罚类型
 */
export enum PenaltyType {
  OFFLINE = 'OFFLINE',
  CHEATING = 'CHEATING',
  CONTENT_VIOLATION = 'CONTENT_VIOLATION',
}

/**
 * 惩罚记录
 */
export interface PenaltyRecord {
  id: string;
  type: PenaltyType;
  amount: number;
  reason: string;
  timestamp: number;
  isResolved: boolean;
}

/**
 * 申诉信息
 */
export interface AppealInfo {
  id: string;
  punishmentId: string;
  reason: string;
  evidence?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewComment?: string;
  createdAt: string;
  reviewedAt?: string;
}

/**
 * 惩罚服务配置
 */
interface PenaltyConfig {
  backendApiUrl: string;
  offlineThresholdMs: number;    // 离线阈值（毫秒）
  heartbeatInterval: number;     // 心跳间隔（毫秒）
  maxMissedHeartbeats: number;   // 最大丢失心跳次数
}

const DEFAULT_CONFIG: PenaltyConfig = {
  backendApiUrl: process.env.BACKEND_API_URL || 'http://localhost:3000',
  offlineThresholdMs: 5 * 60 * 1000,  // 5分钟
  heartbeatInterval: 30000,           // 30秒
  maxMissedHeartbeats: 10,            // 最多丢失10次心跳
};

export class PenaltyService {
  private blockchainService: BlockchainService;
  private monitoringService: MonitoringService | null = null;
  private config: PenaltyConfig;
  private statePath: string;
  
  // 本地惩罚记录
  private penalties: PenaltyRecord[] = [];
  private missedHeartbeats: number = 0;
  private lastHeartbeatTime: number = 0;
  private isPenalized: boolean = false;

  constructor(config?: Partial<PenaltyConfig>) {
    this.blockchainService = new BlockchainService();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.statePath = path.join(app.getPath('userData'), 'penalty-data.json');
    
    // 加载保存的数据
    this.loadData();
  }

  /**
   * 设置监控服务引用
   */
  setMonitoringService(service: MonitoringService): void {
    this.monitoringService = service;
  }

  /**
   * 加载保存的数据
   */
  private loadData(): void {
    try {
      if (fs.existsSync(this.statePath)) {
        const data = fs.readFileSync(this.statePath, 'utf-8');
        const parsed = JSON.parse(data);
        this.penalties = parsed.penalties || [];
        this.missedHeartbeats = parsed.missedHeartbeats || 0;
        this.lastHeartbeatTime = parsed.lastHeartbeatTime || 0;
        this.isPenalized = parsed.isPenalized || false;
      }
    } catch (error) {
      log.error('Error loading penalty data:', error);
    }
  }

  /**
   * 保存数据
   */
  private saveData(): void {
    try {
      const dir = path.dirname(this.statePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const data = {
        penalties: this.penalties,
        missedHeartbeats: this.missedHeartbeats,
        lastHeartbeatTime: this.lastHeartbeatTime,
        isPenalized: this.isPenalized,
      };
      
      fs.writeFileSync(this.statePath, JSON.stringify(data, null, 2));
    } catch (error) {
      log.error('Error saving penalty data:', error);
    }
  }

  /**
   * 记录心跳
   * 节点客户端调用此方法报告在线状态
   */
  async recordHeartbeat(): Promise<{ success: boolean; isOnline: boolean }> {
    const now = Date.now();
    const timeSinceLastHeartbeat = now - this.lastHeartbeatTime;
    
    // 检查是否超过离线阈值
    if (timeSinceLastHeartbeat > this.config.offlineThresholdMs) {
      this.missedHeartbeats++;
      log.warn(`Missed heartbeat: ${this.missedHeartbeats}/${this.config.maxMissedHeartbeats}`);
      
      // 如果超过阈值，通知后端
      if (this.missedHeartbeats >= this.config.maxMissedHeartbeats && !this.isPenalized) {
        await this.reportOfflineToBackend();
      }
    } else {
      // 重置丢失心跳计数
      if (this.missedHeartbeats > 0) {
        this.missedHeartbeats = 0;
        log.info('Heartbeat recovered, missed count reset');
      }
    }
    
    this.lastHeartbeatTime = now;
    this.saveData();
    
    return {
      success: true,
      isOnline: timeSinceLastHeartbeat <= this.config.offlineThresholdMs,
    };
  }

  /**
   * 向后端报告离线状态
   */
  private async reportOfflineToBackend(): Promise<void> {
    try {
      const nodeStatus = this.monitoringService?.getNodeStatus();
      if (!nodeStatus?.nodeId) {
        log.warn('Cannot report offline: node not registered');
        return;
      }

      const response = await fetch(`${this.config.backendApiUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation DetectOfflineNodes {
              detectOfflineNodes {
                detected
                penalized
              }
            }
          `,
        }),
      });

      if (response.ok) {
        this.isPenalized = true;
        this.saveData();
        log.warn('Node reported as offline to backend');
      }
    } catch (error) {
      log.error('Error reporting offline to backend:', error);
    }
  }

  /**
   * 检测本地是否可能存在作弊行为
   * 这是一个基础的本地检测，实际的作弊检测在后端进行
   */
  async detectLocalCheating(
    taskId: string,
    result: string,
    expectedResultHash?: string
  ): Promise<{ isValid: boolean; reason?: string }> {
    // 检查结果是否为空
    if (!result || result.trim() === '') {
      return { isValid: false, reason: 'Empty result' };
    }

    // 检查结果是否太短（可能是敷衍）
    if (result.length < 10) {
      return { isValid: false, reason: 'Result too short' };
    }

    // 如果提供了预期哈希，验证结果
    if (expectedResultHash) {
      const resultHash = this.hashResult(result);
      if (resultHash !== expectedResultHash) {
        return { isValid: false, reason: 'Result hash mismatch' };
      }
    }

    return { isValid: true };
  }

  /**
   * 简单的哈希函数
   */
  private hashResult(result: string): string {
    let hash = 0;
    for (let i = 0; i < result.length; i++) {
      const char = result.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * 提交任务结果时进行本地预检查
   */
  async preCheckTaskResult(
    taskId: string,
    result: string
  ): Promise<{ canSubmit: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    
    // 本地作弊检测
    const cheatingCheck = await this.detectLocalCheating(taskId, result);
    if (!cheatingCheck.isValid) {
      warnings.push(`Local check warning: ${cheatingCheck.reason}`);
    }
    
    // 检查节点是否被惩罚
    if (this.isPenalized) {
      warnings.push('Node is currently penalized');
    }
    
    return {
      canSubmit: true, // 允许提交，后端会进行更严格的检查
      warnings,
    };
  }

  /**
   * 创建申诉
   */
  async createAppeal(
    punishmentId: string,
    reason: string,
    evidence?: string
  ): Promise<{ success: boolean; appealId?: string; error?: string }> {
    try {
      const nodeStatus = this.monitoringService?.getNodeStatus();
      if (!nodeStatus?.nodeId) {
        return { success: false, error: 'Node not registered' };
      }

      const response = await fetch(`${this.config.backendApiUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation CreateAppeal($punishmentId: ID!, $nodeId: ID!, $reason: String!, $evidence: String) {
              createAppeal(punishmentId: $punishmentId, nodeId: $nodeId, reason: $reason, evidence: $evidence) {
                id
                status
              }
            }
          `,
          variables: {
            punishmentId,
            nodeId: nodeStatus.nodeId,
            reason,
            evidence,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.createAppeal) {
          return { success: true, appealId: data.data.createAppeal.id };
        }
      }
      
      return { success: false, error: 'Failed to create appeal' };
    } catch (error) {
      log.error('Error creating appeal:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 获取节点的惩罚历史
   */
  async getPenaltyHistory(): Promise<PenaltyRecord[]> {
    try {
      const nodeStatus = this.monitoringService?.getNodeStatus();
      if (!nodeStatus?.nodeId) {
        return this.penalties;
      }

      const response = await fetch(`${this.config.backendApiUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query NodePunishments($nodeId: ID!) {
              nodePunishments(nodeId: $nodeId) {
                id
                type
                amount
                reason
                isResolved
                createdAt
              }
            }
          `,
          variables: {
            nodeId: nodeStatus.nodeId,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.nodePunishments) {
          return data.data.nodePunishments;
        }
      }
      
      return this.penalties;
    } catch (error) {
      log.error('Error fetching penalty history:', error);
      return this.penalties;
    }
  }

  /**
   * 获取节点的申诉列表
   */
  async getAppeals(): Promise<AppealInfo[]> {
    try {
      const nodeStatus = this.monitoringService?.getNodeStatus();
      if (!nodeStatus?.nodeId) {
        return [];
      }

      const response = await fetch(`${this.config.backendApiUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query NodeAppeals($nodeId: ID!) {
              nodeAppeals(nodeId: $nodeId) {
                id
                punishmentId
                reason
                evidence
                status
                reviewComment
                createdAt
                reviewedAt
              }
            }
          `,
          variables: {
            nodeId: nodeStatus.nodeId,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.nodeAppeals) {
          return data.data.nodeAppeals;
        }
      }
      
      return [];
    } catch (error) {
      log.error('Error fetching appeals:', error);
      return [];
    }
  }

  /**
   * 获取惩罚统计
   */
  async getPenaltyStats(): Promise<{
    totalPenalties: number;
    todayPenalties: number;
    offlinePenalties: number;
    cheatingPenalties: number;
    totalPenaltyAmount: number;
  }> {
    try {
      const response = await fetch(`${this.config.backendApiUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query PenaltyStats {
              penaltyStats {
                totalPenalties
                todayPenalties
                offlinePenalties
                cheatingPenalties
                totalPenaltyAmount
              }
            }
          `,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.penaltyStats) {
          return data.data.penaltyStats;
        }
      }
      
      return {
        totalPenalties: this.penalties.length,
        todayPenalties: 0,
        offlinePenalties: 0,
        cheatingPenalties: 0,
        totalPenaltyAmount: 0,
      };
    } catch (error) {
      log.error('Error fetching penalty stats:', error);
      return {
        totalPenalties: this.penalties.length,
        todayPenalties: 0,
        offlinePenalties: 0,
        cheatingPenalties: 0,
        totalPenaltyAmount: 0,
      };
    }
  }

  /**
   * 检查节点是否被惩罚
   */
  isNodePenalized(): boolean {
    return this.isPenalized;
  }

  /**
   * 获取丢失心跳次数
   */
  getMissedHeartbeats(): number {
    return this.missedHeartbeats;
  }

  /**
   * 重置惩罚状态（用于解决惩罚后）
   */
  resetPenaltyStatus(): void {
    this.isPenalized = false;
    this.missedHeartbeats = 0;
    this.saveData();
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PenaltyConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveData();
  }

  /**
   * 获取当前配置
   */
  getConfig(): PenaltyConfig {
    return { ...this.config };
  }
}