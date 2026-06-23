import { InputType, Field, ID, PartialType, ObjectType } from '@nestjs/graphql';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { NodeType, AIModelType } from '@prisma/client';

@InputType()
export class RegisterNodeInput {
  @Field(() => NodeType)
  @IsEnum(NodeType)
  nodeType: NodeType;

  @Field(() => AIModelType, { nullable: true })
  @IsOptional()
  @IsEnum(AIModelType)
  aiModelType?: AIModelType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  region?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @Field(() => Object, { nullable: true })
  @IsOptional()
  hardwareInfo?: Record<string, any>;
}

@InputType()
export class UpdateNodeInput extends PartialType(RegisterNodeInput) {}

@InputType()
export class ApproveNodeInput {
  @Field()
  approved: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;
}

@InputType()
export class ActivateAIAvatarInput {
  @Field()
  @IsString()
  avatarType: string;

  @Field()
  @IsString()
  nickname: string;

  @Field()
  @IsString()
  sparkNftId: string;
}