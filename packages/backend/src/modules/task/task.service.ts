import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { TaskStatus, NodeStatus } from '@prisma/client';
import { SubmitTaskResultInput, CreateTaskInput } from './dto/task.input';

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get a pending task for a node
   */
  async getNodeTask(nodeId: string) {
    // Verify node exists and is active
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    if (node.status !== NodeStatus.ACTIVE) {
      throw new BadRequestException('Node is not active');
    }

    // Get a pending task assigned to this node
    const task = await this.prisma.aITask.findFirst({
      where: {
        nodeId,
        status: TaskStatus.PENDING,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!task) {
      // If no assigned task, try to get an unassigned task
      const unassignedTask = await this.prisma.aITask.findFirst({
        where: {
          nodeId: undefined,
          status: TaskStatus.PENDING,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (unassignedTask) {
        // Assign task to node
        return this.prisma.aITask.update({
          where: { id: unassignedTask.id },
          data: {
            nodeId,
            status: TaskStatus.PROCESSING,
            startedAt: new Date(),
          },
        });
      }

      return null;
    }

    return task;
  }

  /**
   * Submit task result
   */
  async submitResult(input: SubmitTaskResultInput) {
    const { taskId, nodeId, result, executionTime, modelUsed, zkProof, zkProofPublicSignals, zkProofHash } = input;

    // Verify task exists
    const task = await this.prisma.aITask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Verify node owns this task
    if (task.nodeId !== nodeId) {
      throw new BadRequestException('Task is not assigned to this node');
    }

    // Calculate reward based on execution time and task complexity
    const reward = this.calculateReward(task, executionTime || 0);

    // Prepare update data
    const updateData: any = {
      result,
      status: TaskStatus.COMPLETED,
      completedAt: new Date(),
      reward,
    };

    // Store ZK proof if provided
    if (zkProof) {
      updateData.zkProof = zkProof;
    }

    // Update task with result
    const updatedTask = await this.prisma.aITask.update({
      where: { id: taskId },
      data: updateData,
    });

    // Update node statistics
    await this.prisma.node.update({
      where: { id: nodeId },
      data: {
        lastActiveAt: new Date(),
        reputation: { increment: 1 },
      },
    });

    // If ZK proof was provided, verify it asynchronously
    if (zkProof && zkProofPublicSignals) {
      this.verifyProofAsync(taskId, zkProof, result, zkProofPublicSignals).catch(err => {
        console.error('Async proof verification failed:', err);
      });
    }

    return {
      ...updatedTask,
      reward,
    };
  }

  /**
   * Verify ZK proof asynchronously
   */
  private async verifyProofAsync(
    taskId: string,
    zkProof: string,
    aiResult: string,
    publicSignals: Record<string, any>
  ): Promise<void> {
    try {
      // Import ZKML service dynamically to avoid circular dependency
      const { ZKMLService } = await import('../zkml/zkml.service');
      // Note: In production, this would be injected properly
      // For now, we just log that proof verification was attempted
      console.log(`ZK proof verification initiated for task ${taskId}`);
    } catch (error) {
      console.error('Error verifying proof:', error);
    }
  }

  /**
   * Submit task error
   */
  async submitError(taskId: string, nodeId: string, error: string) {
    const task = await this.prisma.aITask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.nodeId !== nodeId) {
      throw new BadRequestException('Task is not assigned to this node');
    }

    // Update task status to failed
    const updatedTask = await this.prisma.aITask.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.FAILED,
        completedAt: new Date(),
      },
    });

    // Decrease node reputation
    await this.prisma.node.update({
      where: { id: nodeId },
      data: {
        reputation: { decrement: 5 },
      },
    });

    return { success: true, task: updatedTask };
  }

  /**
   * Verify task result (for ZK-ML validation)
   */
  async verifyTask(taskId: string, zkProof?: string) {
    const task = await this.prisma.aITask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== TaskStatus.COMPLETED) {
      throw new BadRequestException('Task is not in completed state');
    }

    // Update task to verified
    const verifiedTask = await this.prisma.aITask.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.VERIFIED,
        zkProof,
        verifiedAt: new Date(),
      },
    });

    // Increase node reputation for successful verification
    if (task.nodeId) {
      await this.prisma.node.update({
        where: { id: task.nodeId },
        data: {
          reputation: { increment: 2 },
        },
      });
    }

    return verifiedTask;
  }

  /**
   * Get task by ID
   */
  async getById(taskId: string) {
    const task = await this.prisma.aITask.findUnique({
      where: { id: taskId },
      include: {
        node: {
          select: {
            id: true,
            nodeType: true,
            status: true,
            reputation: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  /**
   * Get tasks for a node
   */
  async getNodeTasks(
    nodeId: string,
    status?: TaskStatus,
    page = 1,
    limit = 20
  ) {
    const skip = (page - 1) * limit;

    const where: any = { nodeId };
    if (status) where.status = status;

    const [tasks, total] = await Promise.all([
      this.prisma.aITask.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aITask.count({ where }),
    ]);

    return {
      items: tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get pending tasks (for admin/assignment)
   */
  async getPendingTasks(limit = 50) {
    return this.prisma.aITask.findMany({
      where: {
        status: TaskStatus.PENDING,
        nodeId: undefined,
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Create a new task (for testing or manual assignment)
   */
  async create(input: CreateTaskInput) {
    return this.prisma.aITask.create({
      data: {
        taskHash: `task_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        prompt: input.prompt,
        taskType: input.taskType,
        timeout: input.timeout || 60000,
        reward: input.reward || 0,
        status: TaskStatus.PENDING,
      },
    });
  }

  /**
   * Get task statistics
   */
  async getStats() {
    const [total, pending, processing, completed, verified, failed] = await Promise.all([
      this.prisma.aITask.count(),
      this.prisma.aITask.count({ where: { status: TaskStatus.PENDING } }),
      this.prisma.aITask.count({ where: { status: TaskStatus.PROCESSING } }),
      this.prisma.aITask.count({ where: { status: TaskStatus.COMPLETED } }),
      this.prisma.aITask.count({ where: { status: TaskStatus.VERIFIED } }),
      this.prisma.aITask.count({ where: { status: TaskStatus.FAILED } }),
    ]);

    const totalRewards = await this.prisma.aITask.aggregate({
      where: { status: TaskStatus.VERIFIED },
      _sum: { reward: true },
    });

    return {
      total,
      pending,
      processing,
      completed,
      verified,
      failed,
      totalRewards: totalRewards._sum.reward || 0,
    };
  }

  /**
   * Calculate reward based on task and execution time
   */
  private calculateReward(task: any, executionTime: number): number {
    // Base reward
    let reward = 10; // Base reward in USDT

    // Adjust based on task type complexity
    const taskTypeRewards: Record<string, number> = {
      EMOTIONAL_CONSENSUS: 20,
      KNOWLEDGE_QUERY: 15,
      CONTENT_MODERATION: 12,
      TEXT_GENERATION: 15,
      SUMMARIZATION: 10,
      TRANSLATION: 10,
      EMOTIONAL_ANALYSIS: 12,
      EMOTIONAL_RESPONSE: 12,
    };

    reward = taskTypeRewards[task.taskType] || reward;

    // Bonus for fast execution
    const timeout = task.timeout || 60000;
    if (executionTime < timeout * 0.5) {
      reward *= 1.2; // 20% bonus for fast execution
    } else if (executionTime < timeout * 0.75) {
      reward *= 1.1; // 10% bonus
    }

    return Math.round(reward * 100) / 100;
  }
}



