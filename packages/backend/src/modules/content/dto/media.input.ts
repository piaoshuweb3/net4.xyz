import { InputType, Field, ID } from '@nestjs/graphql';
import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { MediaType } from '@prisma/client';

@InputType()
export class UploadMediaInput {
  @Field(() => MediaType)
  @IsEnum(MediaType)
  type: MediaType;

  @Field()
  @IsString()
  filename: string;

  @Field()
  @IsString()
  mimeType: string;

  @Field()
  @IsNumber()
  size: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  width?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  height?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  contentId?: string;
}

@InputType()
export class DeleteMediaInput {
  @Field(() => ID)
  @IsString()
  mediaId: string;
}