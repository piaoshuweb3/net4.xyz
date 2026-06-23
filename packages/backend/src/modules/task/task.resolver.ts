import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TaskService } from './task.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { SubmitTaskResultInput, CreateTaskInput } from './dto/task.input';
import { TaskResponse, PaginatedTasksResponse, TaskStatsResponse } from './dto/task.response';
import { TaskStatus } from '@prisma/client';

@Resolver()
export class TaskResolver {
  constructor(private taskService: TaskService) {}

  /**
   * Get a pending task for a node
   */
  @Query(() => TaskResponse, { nullable: true })
  @UseGuards(AuthGuard)
  async nodeTask(@Args('nodeId', { type: () => ID }) nodeId: string) {
    return this.taskService.getNodeTask(nodeId);
  }

  /**
   * Get task by ID
   */
  @Query(() => TaskResponse)
  async task(@Args('id', { type: () => ID }) id: string) {
    return this.taskService.getById(id);
  }

  /**
   * Get tasks for a node
   */
  @Query(() => PaginatedTasksResponse)
  @UseGuards(AuthGuard)
  async nodeTasks(
    @Args('nodeId', { type: () => ID }) nodeId: string,
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('limit', { defaultValue: 20 }) limit: number,
    @Args('status', { nullable: true, type: () => String }) status?: TaskStatus,
  ) {
    return this.taskService.getNodeTasks(nodeId, status, page, limit);
  }

  /**
   * Get pending tasks (for admin)
   */
  @Query(() => [TaskResponse])
  @UseGuards(AuthGuard)
  async pendingTasks(@Args('limit', { defaultValue: 50 }) limit: number) {
    return this.taskService.getPendingTasks(limit);
  }

  /**
   * Get task statistics
   */
  @Query(() => TaskStatsResponse)
  async taskStats() {
    return this.taskService.getStats();
  }

  /**
   * Submit task result
   */
  @Mutation(() => TaskResponse)
  @UseGuards(AuthGuard)
  async submitTaskResult(@Args('input') input: SubmitTaskResultInput) {
    return this.taskService.submitResult(input);
  }

  /**
   * Submit task error
   */
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async submitTaskError(
    @Args('taskId', { type: () => ID }) taskId: string,
    @Args('nodeId', { type: () => ID }) nodeId: string,
    @Args('error') error: string,
  ) {
    return this.taskService.submitError(taskId, nodeId, error);
  }

  /**
   * Verify task result
   */
  @Mutation(() => TaskResponse)
  @UseGuards(AuthGuard)
  async verifyTask(
    @Args('taskId', { type: () => ID }) taskId: string,
    @Args('zkProof', { nullable: true }) zkProof?: string,
  ) {
    return this.taskService.verifyTask(taskId, zkProof);
  }

  /**
   * Create a new task (for testing/admin)
   */
  @Mutation(() => TaskResponse)
  @UseGuards(AuthGuard)
  async createTask(@Args('input') input: CreateTaskInput) {
    return this.taskService.create(input);
  }
}