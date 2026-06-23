import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { MemberLevel, PaymentMethod, PaymentStatus } from '@prisma/client';

@ObjectType()
export class PaymentOrderResponse {
  @Field(() => ID)
  orderId: string;

  @Field({ nullable: true })
  paymentUrl?: string;

  @Field({ nullable: true })
  receiveAddress?: string;

  @Field({ nullable: true })
  amount?: number;

  @Field({ nullable: true })
  network?: string;

  @Field()
  status: string;
}

@ObjectType()
export class PaymentStatusResponse {
  @Field(() => ID)
  orderId: string;

  @Field(() => PaymentStatus)
  status: PaymentStatus;

  @Field(() => Int)
  amount: number;

  @Field()
  currency: string;

  @Field(() => MemberLevel)
  level: MemberLevel;

  @Field({ nullable: true })
  txHash?: string;
}

@ObjectType()
export class ExchangeRateResponse {
  @Field()
  from: string;

  @Field()
  to: string;

  @Field({ nullable: true })
  rate?: number;
}

@ObjectType()
export class ReconciliationTransaction {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  userEmail?: string;

  @Field()
  userAddress: string;

  @Field(() => Int)
  amount: number;

  @Field(() => MemberLevel)
  level: MemberLevel;

  @Field({ nullable: true })
  txHash?: string;

  @Field()
  completedAt: Date;
}

@ObjectType()
export class ReconciliationResponse {
  @Field()
  startDate: Date;

  @Field()
  endDate: Date;

  @Field(() => Int)
  totalTransactions: number;

  @Field(() => Int)
  totalAmount: number;

  @Field(() => Object)
  byLevel: { BASIC: number; MEDIUM: number; ADVANCED: number };

  @Field(() => [ReconciliationTransaction])
  transactions: ReconciliationTransaction[];
}

// KYC Response Types
@ObjectType()
export class KYCSubmissionResponse {
  @Field()
  submissionId: string;

  @Field()
  verificationUrl: string;

  @Field()
  expiresAt: Date;
}

@ObjectType()
export class KYCStatusResponse {
  @Field()
  verified: boolean;

  @Field()
  level: string;

  @Field(() => Int)
  riskScore: number;

  @Field({ nullable: true })
  documentType?: string;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field({ nullable: true })
  rejectionReason?: string;
}

// Risk Control Response Types
@ObjectType()
export class RiskCheckResponse {
  @Field()
  allowed: boolean;

  @Field()
  riskLevel: string;

  @Field(() => Int)
  riskScore: number;

  @Field(() => [String])
  reasons: string[];

  @Field(() => [String])
  recommendations: string[];

  @Field()
  requiresAdditionalVerification: boolean;
}

@ObjectType()
export class TransactionLimitResponse {
  @Field(() => Int)
  dailyLimit: number;

  @Field(() => Int)
  monthlyLimit: number;

  @Field(() => Int)
  singleTransactionLimit: number;

  @Field()
  requiresKYC: boolean;

  @Field()
  requiresAdditionalAuth: boolean;
}