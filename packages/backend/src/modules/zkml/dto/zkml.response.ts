import { ObjectType, Field, ID, Float } from '@nestjs/graphql';

@ObjectType()
export class ZKProofResponse {
  @Field(() => ID)
  taskId: string;

  @Field(() => String)
  proof: string;

  @Field(() => String)
  publicSignals: string;

  @Field(() => String)
  proofHash: string;

  @Field(() => Float)
  generationTime: number;
}

@ObjectType()
export class VerificationResultResponse {
  @Field(() => Boolean)
  isValid: boolean;

  @Field(() => String)
  message: string;

  @Field(() => Float, { nullable: true })
  confidence?: number;

  @Field(() => String, { nullable: true })
  errorCode?: string;
}

@ObjectType()
export class WorkProofResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String)
  message: string;

  @Field(() => Float, { nullable: true })
  reward?: number;

  @Field(() => Float, { nullable: true })
  newReputation?: number;
}

@ObjectType()
export class EmotionalConsensusResponse {
  @Field(() => String)
  consensusEmotion: string;

  @Field(() => Float)
  consensusScore: number;

  @Field(() => String)
  intensityVariance: string;

  @Field(() => Boolean)
  isValid: boolean;

  @Field(() => [EmotionalAnalysisItemResponse])
  individualAnalyses: EmotionalAnalysisItemResponse[];

  @Field(() => String)
  timestamp: string;
}

@ObjectType()
export class EmotionalAnalysisItemResponse {
  @Field(() => String)
  primaryEmotion: string;

  @Field(() => String)
  sentiment: string;

  @Field(() => Float)
  intensity: number;
}

@ObjectType()
export class AntiCheatResponse {
  @Field(() => Boolean)
  isValid: boolean;

  @Field(() => String)
  message: string;

  @Field(() => [String], { nullable: true })
  violations?: string[];

  @Field(() => Float, { nullable: true })
  riskScore?: number;
}

@ObjectType()
export class ZKMLStatsResponse {
  @Field(() => Float)
  totalProofsGenerated: number;

  @Field(() => Float)
  totalProofsVerified: number;

  @Field(() => Float)
  successRate: number;

  @Field(() => Float)
  averageProofTime: number;

  @Field(() => Float)
  cheatingAttemptsDetected: number;
}