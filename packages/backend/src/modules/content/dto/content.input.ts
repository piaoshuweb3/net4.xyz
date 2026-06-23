import { InputType, Field, ID, PartialType } from '@nestjs/graphql';
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum } from 'class-validator';
import { ContentType } from '@prisma/client';

@InputType()
export class CreateContentInput {
  @Field(() => ContentType)
  @IsEnum(ContentType)
  type: ContentType;

  @Field()
  @IsString()
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  summary?: string;

  @Field()
  @IsString()
  content: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  price?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  tags?: string[];
}

@InputType()
export class UpdateContentInput extends PartialType(CreateContentInput) {}

@InputType()
export class PublishContentInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  publishToIpfs?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  publishToChain?: boolean;
}

@InputType()
export class ApproveContentInput {
  @Field()
  @IsBoolean()
  approved: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;
}