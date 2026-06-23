import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class SecuritiesCheckResult {
  @Field()
  allowed: boolean;

  @Field()
  productType: string;

  @Field(() => [String])
  messaging: string[];

  @Field(() => [String])
  warnings: string[];
}

@ObjectType()
export class AmlCheckResult {
  @Field()
  allowed: boolean;

  @Field()
  riskLevel: string;

  @Field(() => [String])
  flags: string[];

  @Field()
  requiresManualReview: boolean;
}

@ObjectType()
export class RefundRiskCheckResult {
  @Field()
  allowed: boolean;

  @Field()
  refundEligibility: boolean;

  @Field()
  riskScore: number;

  @Field(() => [String])
  reasons: string[];
}

@ObjectType()
export class ComplianceCheckResultDto {
  @Field()
  allowed: boolean;

  @Field(() => SecuritiesCheckResult)
  securitiesCheck: SecuritiesCheckResult;

  @Field(() => AmlCheckResult)
  amlCheck: AmlCheckResult;

  @Field(() => RefundRiskCheckResult)
  refundRiskCheck: RefundRiskCheckResult;

  @Field()
  overallRisk: string;
}
