import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { MemberLevel, NodeType, NodeStatus } from '@prisma/client';

@ObjectType()
export class UserNodeResponse {
  @Field(() => ID)
  id: string;

  @Field(() => NodeType)
  nodeType: NodeType;

  @Field(() => NodeStatus)
  status: NodeStatus;

  @Field(() => Int)
  reputation: number;

  @Field()
  stakedAmount: number;

  @Field({ nullable: true })
  region?: string;

  @Field({ nullable: true })
  lastActiveAt?: Date;
}

@ObjectType()
export class UserResponse {
  @Field(() => ID)
  id: string;

  @Field()
  address: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  twitter?: string;

  @Field(() => MemberLevel)
  memberLevel: MemberLevel;

  @Field({ nullable: true })
  memberExpiry?: Date;

  @Field({ nullable: true })
  nodeId?: string;

  @Field(() => UserNodeResponse, { nullable: true })
  node?: UserNodeResponse;

  @Field({ nullable: true })
  avatar?: string;

  @Field({ nullable: true })
  bio?: string;

  @Field()
  isVerified: boolean;

  @Field()
  isAdmin: boolean;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class PaginatedUsersResponse {
  @Field(() => [UserResponse])
  items: UserResponse[];

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
export class UserStatsResponse {
  @Field(() => Int)
  contentCount: number;

  @Field(() => Int)
  transactionCount: number;

  @Field(() => Int)
  memberTransactionCount: number;
}