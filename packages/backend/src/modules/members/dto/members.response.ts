import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { MemberLevel, PaymentMethod, PaymentStatus } from '@prisma/client';

@ObjectType()
export class MemberPriceResponse {
  @Field(() => MemberLevel)
  level: MemberLevel;

  @Field(() => Int)
  price: number;

  @Field(() => [String])
  benefits: string[];
}

@ObjectType()
export class MembershipInfoResponse {
  @Field(() => MemberLevel)
  level: MemberLevel;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field()
  isExpired: boolean;

  @Field(() => Int)
  daysLeft: number;

  @Field(() => [String])
  benefits: string[];
}

@ObjectType()
export class MemberOrderResponse {
  @Field(() => ID)
  id: string;

  @Field(() => Float)
  amount: number;

  @Field(() => MemberLevel)
  level: MemberLevel;

  @Field(() => PaymentMethod)
  paymentMethod: PaymentMethod;

  @Field(() => PaymentStatus)
  status: PaymentStatus;

  @Field({ nullable: true })
  txHash?: string;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class PaginatedOrdersResponse {
  @Field(() => [MemberOrderResponse])
  items: MemberOrderResponse[];

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
export class MemberStatisticsResponse {
  @Field(() => Int)
  totalMembers: number;

  @Field(() => Object)
  byLevel: { basic: number; medium: number; advanced: number; none: number };

  @Field(() => Object)
  newMembersLast30Days: { basic: number; medium: number; advanced: number; total: number };

  @Field(() => Object)
  revenue: { last30Days: number; growth: number };

  @Field(() => Int)
  expiringIn30Days: number;

  @Field(() => Int)
  activeMembers: number;
}

@ObjectType()
export class MemberTrendResponse {
  @Field()
  date: string;

  @Field(() => Int)
  basic: number;

  @Field(() => Int)
  medium: number;

  @Field(() => Int)
  advanced: number;

  @Field(() => Float)
  revenue: number;
}

@ObjectType()
export class MemberRevenueDistributionResponse {
  @Field(() => Object)
  basic: { revenue: number; count: number; percentage: number };

  @Field(() => Object)
  medium: { revenue: number; count: number; percentage: number };

  @Field(() => Object)
  advanced: { revenue: number; count: number; percentage: number };

  @Field(() => Float)
  total: number;
}