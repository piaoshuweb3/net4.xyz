import { InputType, Field, ID, PartialType } from '@nestjs/graphql';
import { IsString, IsOptional, IsEmail, IsEnum, IsBoolean } from 'class-validator';
import { MemberLevel } from '@prisma/client';

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  twitter?: string;

  @Field(() => MemberLevel, { nullable: true })
  @IsOptional()
  @IsEnum(MemberLevel)
  memberLevel?: MemberLevel;

  @Field({ nullable: true })
  @IsOptional()
  memberExpiry?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  nodeId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

@InputType()
export class UpdateProfileInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  avatar?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  bio?: string;
}

@InputType()
export class UserFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  twitter?: string;

  @Field(() => MemberLevel, { nullable: true })
  @IsOptional()
  @IsEnum(MemberLevel)
  memberLevel?: MemberLevel;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}