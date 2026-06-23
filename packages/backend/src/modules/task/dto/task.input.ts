import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsNumber, IsEnum, IsObject } from 'class-validator';

@InputType()
export class SubmitTaskResultInput {
  @Field(() => ID)
  @IsString()
  taskId: string;

  @Field(() => ID)
  @IsString()
  nodeId: string;

  @Field()
  @IsString()
  result: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  executionTime?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  modelUsed?: string;

  // ZK Proof fields
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  zkProof?: string;

  @Field(() => Object, { nullable: true })
  @IsOptional()
  @IsObject()
  zkProofPublicSignals?: Record<string, any>;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  zkProofHash?: string;
}

@InputType()
export class CreateTaskInput {
  @Field()
  @IsString()
  prompt: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  taskType?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  reward?: number;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  nodeId?: string;
}