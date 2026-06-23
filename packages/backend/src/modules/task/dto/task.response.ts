import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { TaskStatus } from '@prisma/client';

@ObjectType()
export class TaskResponse {
  @Field(() => ID)
  id: string;

  @Field(() => ID, { nullable: true })
  nodeId?: string;

  @Field()
  taskHash: string;

  @Field()
  prompt: string;

  @Field({ nullable: true })
  result?: string;

  @Field(() => TaskStatus)
  status: TaskStatus;

  @Field(() => Float)
  reward: number;

  @Field({ nullable: true })
  zkProof?: string;

  @Field({ nullable: true })
  verifiedAt?: Date;

  @Field({ nullable: true })
  startedAt?: Date;

  @Field({ nullable: true })
  completedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class PaginatedTasksResponse {
  @Field(() => [TaskResponse])
  items: TaskResponse[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;
}

@ObjectType()
export class TaskStatsResponse {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  pending: number;

  @Field(() => Int)
  processing: number;

  @Field(() => Int)
  completed: number;

  @Field(() => Int)
  verified: number;

  @Field(() => Int)
  failed: number;

  @Field(() => Float)
  totalRewards: number;
}