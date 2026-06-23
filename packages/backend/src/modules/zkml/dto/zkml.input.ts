import { InputType, Field, ID, Float } from '@nestjs/graphql';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

@InputType()
export class GenerateProofInput {
  @Field(() => ID)
  @IsString()
  taskId: string;

  @Field(() => String)
  @IsString()
  prompt: string;

  @Field(() => String)
  @IsString()
  aiResult: string;

  @Field(() => String)
  @IsString()
  modelHash: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  inputHash?: string;
}

@InputType()
export class VerifyProofInput {
  @Field(() => ID)
  @IsString()
  taskId: string;

  @Field(() => String)
  @IsString()
  proof: string;

  @Field(() => String)
  @IsString()
  aiResult: string;

  @Field(() => String)
  @IsString()
  publicSignals: string;
}

@InputType()
export class SubmitWorkProofInput {
  @Field(() => ID)
  @IsString()
  nodeId: string;

  @Field(() => String)
  @IsString()
  taskHash: string;

  @Field(() => String)
  @IsString()
  aiResult: string;

  @Field(() => String)
  @IsString()
  zkProof: string;
}

@InputType()
export class EmotionalConsensusInput {
  @Field(() => [String])
  @IsString({ each: true })
  inputs: string[];

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number;
}

@InputType()
export class AntiCheatCheckInput {
  @Field(() => ID)
  @IsString()
  nodeId: string;

  @Field(() => ID)
  @IsString()
  taskId: string;

  @Field(() => String)
  @IsString()
  aiResult: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  resultHash?: string;
}