import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { NodeType, NodeStatus, AIModelType, PunishmentType, AppealStatus } from '@prisma/client';
import { RegisterNodeInput, ApproveNodeInput, UpdateNodeInput } from './dto/node.input';

@Injectable()
export class NodeService {
  // 节点抵押金额配置
  private readonly STAKE_AMOUNTS: Record<NodeType, number> = {
    [NodeType.CORE]: 100000,    // 核心节点: 10�?USDT
    [NodeType.SUB]: 9999,       // 子节�? 9999 USDT
    [NodeType.NORMAL]: 9999,    // 普通节�? 9999 USDT
  };

  // 节点数量限制
  private readonly NODE_LIMITS: Record<NodeType, number> = {
    [NodeType.CORE]: 21,
    [NodeType.SUB]: 128,
    [NodeType.NORMAL]: 10000,
  };

  constructor(private prisma: PrismaService) {}

  /**
   * 注册节点
   */
  async register(userId: string, input: RegisterNodeInput) {
    // 检查用户是否已有节�?
    const existingNode = await this.prisma.node.findUnique({
      where: { ownerId: userId },
    });

    if (existingNode) {
      throw new BadRequestException('User already has a node');
    }

    // 检查节点类型数量限�?
    const currentCount = await this.prisma.node.count({
      where: { nodeType: input.nodeType },
    });

    if (currentCount >= this.NODE_LIMITS[input.nodeType]) {
      throw new BadRequestException(`Node type ${input.nodeType} has reached its limit`);
    }

    // 创建节点
    const node = await this.prisma.node.create({
      data: {
        ownerId: userId,
        nodeType: input.nodeType,
        status: NodeStatus.PENDING,
        aiModelType: input.aiModelType || AIModelType.GPT_4O,
        region: input.region,
        ipAddress: input.ipAddress,
        hardwareInfo: input.hardwareInfo,
        stakedAmount: this.STAKE_AMOUNTS[input.nodeType],
      },
    });

    // 更新用户�?nodeId
    await this.prisma.user.update({
      where: { id: userId },
      data: { nodeId: node.id },
    });

    return node;
  }

  /**
   * 审批节点（管理员�?
   */
  async approveNode(nodeId: string, input: ApproveNodeInput) {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    if (node.status !== NodeStatus.PENDING) {
      throw new BadRequestException('Node is not in pending status');
    }

    const newStatus = input.approved ? NodeStatus.ACTIVE : NodeStatus.REJECTED;

    return this.prisma.node.update({
      where: { id: nodeId },
      data: {
        status: newStatus,
        approvedAt: input.approved ? new Date() : null,
      },
    });
  }

  /**
   * 更新节点信息
   */
  async updateNode(nodeId: string, userId: string, input: UpdateNodeInput) {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    if (node.ownerId !== userId) {
      throw new BadRequestException('Not authorized to update this node');
    }

    return this.prisma.node.update({
      where: { id: nodeId },
      data: {
        region: input.region,
        ipAddress: input.ipAddress,
        hardwareInfo: input.hardwareInfo,
      },
    });
  }

  /**
   * 获取节点详情
   */
  async getById(nodeId: string) {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      include: {
        owner: {
          select: {
            id: true,
            address: true,
            email: true,
            avatar: true,
          },
        },
        tasks: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        punishments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    return node;
  }

  /**
   * 获取节点列表
   */
  async getList(
    nodeType?: NodeType,
    status?: NodeStatus,
    page = 1,
    limit = 20,
    region?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (nodeType) where.nodeType = nodeType;
    if (status) where.status = status;
    if (region) where.region = region;

    const [nodes, total] = await Promise.all([
      this.prisma.node.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              address: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.node.count({ where }),
    ]);

    return {
      items: nodes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取待审批节点列�?
   */
  async getPendingNodes(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [nodes, total] = await Promise.all([
      this.prisma.node.findMany({
        where: { status: NodeStatus.PENDING },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          owner: {
            select: {
              id: true,
              address: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.node.count({ where: { status: NodeStatus.PENDING } }),
    ]);

    return {
      items: nodes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取活跃节点列表
   */
  async getActiveNodes() {
    return this.prisma.node.findMany({
      where: { status: NodeStatus.ACTIVE },
      orderBy: { reputation: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            address: true,
            avatar: true,
          },
        },
      },
    });
  }

  /**
   * 更新节点状�?
   */
  async updateStatus(nodeId: string, status: NodeStatus) {
    return this.prisma.node.update({
      where: { id: nodeId },
      data: {
        status,
        lastActiveAt: status === NodeStatus.ACTIVE ? new Date() : undefined,
      },
    });
  }

  /**
   * 更新节点信誉
   */
  async updateReputation(nodeId: string, change: number) {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    const newReputation = Math.max(0, node.reputation + change);

    return this.prisma.node.update({
      where: { id: nodeId },
      data: { reputation: newReputation },
    });
  }

  /**
   * 触发惩罚机制
   */
  async punish(nodeId: string, type: PunishmentType, amount: number, reason: string) {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    // 创建惩罚记录
    const punishment = await this.prisma.punishment.create({
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

    return punishment;
  }

  /**
   * 解除惩罚
   */
  async resolvePunishment(punishmentId: string) {
    const punishment = await this.prisma.punishment.findUnique({
      where: { id: punishmentId },
    });

    if (!punishment) {
      throw new NotFoundException('Punishment not found');
    }

    // 更新惩罚状�?
    await this.prisma.punishment.update({
      where: { id: punishmentId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });

    // 恢复节点状�?
    await this.prisma.node.update({
      where: { id: punishment.nodeId },
      data: { status: NodeStatus.ACTIVE },
    });

    return { success: true };
  }

  /**
   * 创建申诉
   */
  async createAppeal(punishmentId: string, nodeId: string, reason: string, evidence?: string) {
    // 验证惩罚记录存在
    const punishment = await this.prisma.punishment.findUnique({
      where: { id: punishmentId },
    });

    if (!punishment) {
      throw new NotFoundException('Punishment not found');
    }

    if (punishment.nodeId !== nodeId) {
      throw new BadRequestException('Punishment does not belong to this node');
    }

    // 检查是否已有待处理的申�?
    const existingAppeal = await this.prisma.appeal.findFirst({
      where: {
        punishmentId,
        status: AppealStatus.PENDING,
      },
    });

    if (existingAppeal) {
      throw new BadRequestException('There is already a pending appeal for this punishment');
    }

    // 创建申诉记录
    const appeal = await this.prisma.appeal.create({
      data: {
        punishmentId,
        nodeId,
        reason,
        evidence,
        status: AppealStatus.PENDING,
      },
    });

    return appeal;
  }

  /**
   * 获取节点的申诉列�?
   */
  async getAppealsByNode(nodeId: string) {
    return this.prisma.appeal.findMany({
      where: { nodeId },
      orderBy: { createdAt: 'desc' },
      include: {
        punishment: true,
      },
    });
  }

  /**
   * 获取申诉详情
   */
  async getAppeal(appealId: string) {
    const appeal = await this.prisma.appeal.findUnique({
      where: { id: appealId },
      include: {
        punishment: true,
        node: true,
      },
    });

    if (!appeal) {
      throw new NotFoundException('Appeal not found');
    }

    return appeal;
  }

  /**
   * 审核申诉
   */
  async reviewAppeal(
    appealId: string,
    reviewerId: string,
    approved: boolean,
    reviewComment: string
  ) {
    const appeal = await this.prisma.appeal.findUnique({
      where: { id: appealId },
    });

    if (!appeal) {
      throw new NotFoundException('Appeal not found');
    }

    if (appeal.status !== AppealStatus.PENDING) {
      throw new BadRequestException('Appeal has already been reviewed');
    }

    // 更新申诉状�?
    const updatedAppeal = await this.prisma.appeal.update({
      where: { id: appealId },
      data: {
        status: approved ? AppealStatus.APPROVED : AppealStatus.REJECTED,
        reviewerId,
        reviewComment,
        reviewedAt: new Date(),
      },
    });

    // 如果申诉通过，恢复节点抵押金
    if (approved) {
      // Fetch the punishment to get the amount
      const punishment = await this.prisma.punishment.findUnique({
        where: { id: appeal.punishmentId },
      });
      
      await this.prisma.node.update({
        where: { id: appeal.nodeId },
        data: {
          stakedAmount: { increment: punishment?.amount || 0 },
          status: NodeStatus.ACTIVE,
        },
      });

      // 标记惩罚为已解决
      await this.prisma.punishment.update({
        where: { id: appeal.punishmentId },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
        },
      });
    }

    return updatedAppeal;
  }

  /**
   * 获取待审核的申诉列表
   */
  async getPendingAppeals() {
    return this.prisma.appeal.findMany({
      where: { status: AppealStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      include: {
        punishment: true,
        node: true,
      },
    });
  }

  /**
   * 获取节点统计信息
   */
  async getStats() {
    const [total, active, offline, punishing, pending] = await Promise.all([
      this.prisma.node.count(),
      this.prisma.node.count({ where: { status: NodeStatus.ACTIVE } }),
      this.prisma.node.count({ where: { status: NodeStatus.OFFLINE } }),
      this.prisma.node.count({ where: { status: NodeStatus.PUNISHING } }),
      this.prisma.node.count({ where: { status: NodeStatus.PENDING } }),
    ]);

    const nodeTypeCounts = await this.prisma.node.groupBy({
      by: ['nodeType'],
      _count: true,
    });

    return {
      total,
      active,
      offline,
      punishing,
      pending,
      byType: nodeTypeCounts.reduce((acc, item) => {
        acc[item.nodeType] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * 获取节点收益信息
   */
  async getNodeEarnings(nodeId: string) {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    // 计算已完成的任务数量和总奖�?
    const taskStats = await this.prisma.aITask.aggregate({
      where: {
        nodeId,
        status: 'VERIFIED',
      },
      _sum: {
        reward: true,
      },
      _count: true,
    });

    // 计算惩罚总额
    const punishmentStats = await this.prisma.punishment.aggregate({
      where: { nodeId },
      _sum: {
        amount: true,
      },
    });

    return {
      nodeId,
      nodeType: node.nodeType,
      stakedAmount: node.stakedAmount,
      reputation: node.reputation,
      completedTasks: taskStats._count,
      totalEarnings: taskStats._sum.reward || 0,
      totalPenalties: punishmentStats._sum.amount || 0,
      netEarnings: (taskStats._sum.reward || 0) - (punishmentStats._sum.amount || 0),
    };
  }

  /**
   * 检查节点是否在�?
   */
  async checkNodeOnline(nodeId: string): Promise<boolean> {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (!node || node.status !== NodeStatus.ACTIVE) {
      return false;
    }

    // 检查最后活跃时�?
    if (node.lastActiveAt) {
      const timeSinceLastActive = Date.now() - node.lastActiveAt.getTime();
      const offlineThreshold = 5 * 60 * 1000; // 5分钟

      if (timeSinceLastActive > offlineThreshold) {
        // 标记为离�?
        await this.prisma.node.update({
          where: { id: nodeId },
          data: { status: NodeStatus.OFFLINE },
        });
        return false;
      }
    }

    return true;
  }

  /**
   * 节点心跳
   */
  async heartbeat(nodeId: string) {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    // 如果节点离线，恢复为活跃
    if (node.status === NodeStatus.OFFLINE) {
      await this.prisma.node.update({
        where: { id: nodeId },
        data: { status: NodeStatus.ACTIVE },
      });
    }

    return this.prisma.node.update({
      where: { id: nodeId },
      data: { lastActiveAt: new Date() },
    });
  }

  /**
   * 获取抵押金额
   */
  getStakeAmount(nodeType: NodeType): number {
    return this.STAKE_AMOUNTS[nodeType];
  }

  /**
   * 获取节点数量限制
   */
  getNodeLimit(nodeType: NodeType): number {
    return this.NODE_LIMITS[nodeType];
  }

  /**
   * 激�?AI 分身
   */
  async activateaIAvatar(
    nodeId: string,
    userId: string,
    avatarType: string,
    nickname: string,
    sparkNftId: string
  ) {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    if (node.ownerId !== userId) {
      throw new BadRequestException('Not authorized to activate AI avatar for this node');
    }

    if (node.status !== NodeStatus.ACTIVE) {
      throw new BadRequestException('Node must be active to activate AI avatar');
    }

    // Create AI avatar record
    const aIAvatar = await this.prisma.aIAvatar.create({
      data: {
        nodeId,
        avatarType,
        nickname,
        sparkNftId,
        status: 'ACTIVE',
      },
    });

    // Update node with avatar info
    await this.prisma.node.update({
      where: { id: nodeId },
      data: {
        aiAvatarId: aIAvatar.id,
      },
    });

    return aIAvatar;
  }

  /**
   * 获取节点�?AI 分身
   */
  async getNodeaIAvatar(nodeId: string) {
    return this.prisma.aIAvatar.findFirst({
      where: { nodeId },
    });
  }

  /**
   * 更新 AI 分身
   */
  async updateaIAvatar(
    avatarId: string,
    userId: string,
    nickname?: string,
    avatarType?: string
  ) {
    const avatar = await this.prisma.aIAvatar.findUnique({
      where: { id: avatarId },
      include: { node: true },
    });

    if (!avatar) {
      throw new NotFoundException('AI avatar not found');
    }

    if (avatar.node.ownerId !== userId) {
      throw new BadRequestException('Not authorized to update this AI avatar');
    }

    return this.prisma.aIAvatar.update({
      where: { id: avatarId },
      data: {
        nickname: nickname || avatar.nickname,
        avatarType: avatarType || avatar.avatarType,
      },
    });
  }
}





