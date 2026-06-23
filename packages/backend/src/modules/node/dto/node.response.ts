import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { NodeType, NodeStatus, AIModelType, TaskStatus, PunishmentType } from '@prisma/client';

@ObjectType()
export class OwnerResponse {
  @Field(() => ID)
  id: string;

  @Field()
  address: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  avatar?: string;
}

@ObjectType()
export class NodeTaskResponse {
  @Field(() => ID)
  id: string;

  @Field()
  taskHash: string;

  @Field()
  prompt: string;

  @Field({ nullable: true })
  result?: string;

  @Field(() => TaskStatus)
  status: TaskStatus;

  @Field(() => Int)
  reward: number;

  @Field({ nullable: true })
  verifiedAt?: Date;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class PunishmentResponse {
  @Field(() => ID)
  id: string;

  @Field(() => PunishmentType)
  type: PunishmentType;

  @Field(() => Int)
  amount: number;

  @Field()
  reason: string;

  @Field()
  isResolved: boolean;

  @Field({ nullable: true })
  resolvedAt?: Date;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class NodeResponse {
  @Field(() => ID)
  id: string;

  @Field(() => NodeType)
  nodeType: NodeType;

  @Field(() => NodeStatus)
  status: NodeStatus;

  @Field(() => AIModelType)
  aiModelType: AIModelType;

  @Field(() => Int)
  reputation: number;

  @Field(() => Int)
  stakedAmount: number;

  @Field({ nullable: true })
  region?: string;

  @Field({ nullable: true })
  ipAddress?: string;

  @Field(() => Object, { nullable: true })
  hardwareInfo?: object;

  @Field({ nullable: true })
  lastActiveAt?: Date;

  @Field({ nullable: true })
  approvedAt?: Date;

  @Field(() => OwnerResponse)
  owner: OwnerResponse;

  @Field(() => [NodeTaskResponse], { nullable: true })
  tasks?: NodeTaskResponse[];

  @Field(() => [PunishmentResponse], { nullable: true })
  punishments?: PunishmentResponse[];

  @Field()
  createdAt: Date;
}

@ObjectType()
export class PaginatedNodesResponse {
  @Field(() => [NodeResponse])
  items: NodeResponse[];

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
export class NodeStatsResponse {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  active: number;

  @Field(() => Int)
  offline: number;

  @Field(() => Int)
  punishing: number;

  @Field(() => Int)
  pending: number;

  @Field(() => Object)
  byType: { CORE: number; SUB: number; NORMAL: number };
}

@ObjectType()
export class NodeEarningsResponse {
  @Field(() => ID)
  nodeId: string;

  @Field(() => NodeType)
  nodeType: NodeType;

  @Field(() => Int)
  stakedAmount: number;

  @Field(() => Int)
  reputation: number;

  @Field(() => Int)
  completedTasks: number;

  @Field(() => Int)
  totalEarnings: number;

  @Field(() => Int)
  totalPenalties: number;

  @Field(() => Int)
  netEarnings: number;
}

@ObjectType()
export class AIAvatarResponse {
  @Field(() => ID)
  id: string;

  @Field()
  nodeId: string;

  @Field()
  avatarType: string;

  @Field()
  nickname: string;

  @Field()
  sparkNftId: string;

  @Field()
  status: string;

  @Field({ nullable: true })
  modelId?: string;

  @Field()
  createdAt: Date;
}