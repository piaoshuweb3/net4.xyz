import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { NodeStatus, PunishmentType } from '@prisma/client';

/**
 * 惩罚配置
 */
interface PenaltyConfig {
  offlineThresholdMs: number;    // 离线阈值（毫秒）
  offlinePenaltyAmount: number;  // 离线每次扣款金额
  maxOfflinePenaltyPerDay: number; // 每天最大离线扣款次数
  cheatingPenaltyAmount: number; // 作弊扣款金额
  contentViolationPenaltyAmount: number; // 内容违规扣款金额
}

const DEFAULT_PENALTY_CONFIG: PenaltyConfig = {
  offlineThresholdMs: 5 * 60 * 1000,  // 5分钟无心跳视为离线
  offlinePenaltyAmount: 100,          // 每次离线扣 100 USDT
  maxOfflinePenaltyPerDay: 10,        // 每天最多扣 10 次
  cheatingPenaltyAmount: 1000,        // 作弊扣 1000 USDT
  contentViolationPenaltyAmount: 500, // 内容违规扣 500 USDT
};

@Injectable()
export class PenaltyService {
  private readonly logger = new Logger(PenaltyService.name);
  private config: PenaltyConfig;

  constructor(private prisma: PrismaService) {
    this.config = DEFAULT_PENALTY_CONFIG;
  }

  /**
   * 检测离线节点并触发惩罚
   * 定时任务调用
   */
  async detectOfflineNodes(): Promise<{ detected: number; penalized: number }> {
    this.logger.log('Starting offline node detection...');

    const threshold = new Date(Date.now() - this.config.offlineThresholdMs);

    // 查找超过阈值未活跃的节点
    const offlineNodes = await this.prisma.node.findMany({
      where: {
        status: NodeStatus.ACTIVE,
        lastActiveAt: {
          lt: threshold,
        },
      },
    });

    this.logger.log(`Found ${offlineNodes.length} potentially offline nodes`);

    let penalizedCount = 0;

    for (const node of offlineNodes) {
      try {
        // 检查今天已经扣了多少次
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayPenalties = await this.prisma.punishment.count({
          where: {
            nodeId: node.id,
            type: PunishmentType.OFFLINE,
            createdAt: { gte: todayStart },
          },
        });

        if (todayPenalties >= this.config.maxOfflinePenaltyPerDay) {
          this.logger.debug(`Node ${node.id} has reached max offline penalties for today`);
          continue;
        }

        // 触发惩罚
        await this.punishNode(
          node.id,
          PunishmentType.OFFLINE,
          this.config.offlinePenaltyAmount,
          `Node offline for more than ${this.config.offlineThresholdMs / 60000} minutes`
        );

        penalizedCount++;
        this.logger.log(`Penalized offline node: ${node.id}`);
      } catch (error) {
        this.logger.error(`Error penalizing node ${node.id}:`, error);
      }
    }

    this.logger.log(`Offline detection complete. Detected: ${offlineNodes.length}, Penalized: ${penalizedCount}`);
    return { detected: offlineNodes.length, penalized: penalizedCount };
  }

  /**
   * 惩罚节点
   */
  async punishNode(nodeId: string, type: PunishmentType, amount: number, reason: string) {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    // 检查抵押金额是否足够
    if (node.stakedAmount < amount) {
      this.logger.warn(`Node ${nodeId} has insufficient stake. Current: ${node.stakedAmount}, Required: ${amount}`);
      // 如果抵押不足，扣完剩余的
      amount = node.stakedAmount;
    }

    // 创建惩罚记录
    await this.prisma.punishment.create({
      data: {
        nodeId,
        type,
        amount,
        reason,
      },
    });

    // 更新节点状态和抵押金额
    await this.prisma.node.update({
      where: { id: nodeId },
      data: {
        status: NodeStatus.PUNISHING,
        stakedAmount: { decrement: amount },
      },
    });

    // 如果抵押金额为0，标记为离线
    if (node.stakedAmount - amount <= 0) {
      await this.prisma.node.update({
        where: { id: nodeId },
        data: { status: NodeStatus.OFFLINE },
      });
    }

    this.logger.log(`Node ${nodeId} penalized: ${type}, amount: ${amount}, reason: ${reason}`);
  }

  /**
   * 触发作弊惩罚
   */
  async punishForCheating(nodeId: string, reason: string) {
    return this.punishNode(
      nodeId,
      PunishmentType.CHEATING,
      this.config.cheatingPenaltyAmount,
      reason
    );
  }

  /**
   * 触发内容违规惩罚
   */
  async punishForContentViolation(nodeId: string, reason: string) {
    return this.punishNode(
      nodeId,
      PunishmentType.CONTENT_VIOLATION,
      this.config.contentViolationPenaltyAmount,
      reason
    );
  }

  /**
   * 解除惩罚并恢复节点
   */
  async resolvePunishment(punishmentId: string) {
    const punishment = await this.prisma.punishment.findUnique({
      where: { id: punishmentId },
    });

    if (!punishment) {
      throw new Error(`Punishment not found: ${punishmentId}`);
    }

    // 更新惩罚状态
    await this.prisma.punishment.update({
      where: { id: punishmentId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });

    // 恢复节点状态
    await this.prisma.node.update({
      where: { id: punishment.nodeId },
      data: { status: NodeStatus.ACTIVE },
    });

    return { success: true };
  }

  /**
   * 获取惩罚统计
   */
  async getPenaltyStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalPenalties,
      todayPenalties,
      offlinePenalties,
      cheatingPenalties,
      contentViolations,
      totalPenaltyAmount,
    ] = await Promise.all([
      this.prisma.punishment.count(),
      this.prisma.punishment.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.punishment.count({
        where: { type: PunishmentType.OFFLINE },
      }),
      this.prisma.punishment.count({
        where: { type: PunishmentType.CHEATING },
      }),
      this.prisma.punishment.count({
        where: { type: PunishmentType.CONTENT_VIOLATION },
      }),
      this.prisma.punishment.aggregate({
        _sum: { amount: true },
      }),
    ]);

    return {
      totalPenalties,
      todayPenalties,
      offlinePenalties,
      cheatingPenalties,
      contentViolations,
      totalPenaltyAmount: totalPenaltyAmount._sum.amount || 0,
    };
  }

  /**
   * 获取节点的惩罚历史
   */
  async getNodePunishments(nodeId: string) {
    return this.prisma.punishment.findMany({
      where: { nodeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PenaltyConfig>) {
    this.config = { ...this.config, ...config };
    this.logger.log('Penalty config updated:', this.config);
  }

  /**
   * 获取当前配置
   */
  getConfig(): PenaltyConfig {
    return { ...this.config };
  }
}