import { InputType, Field, ID } from '@nestjs/graphql';
import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

@InputType()
export class ReportContentInput {
  @Field(() => ID)
  @IsString()
  contentId: string;

  @Field()
  @IsString()
  reason: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  details?: string;
}

@InputType()
export class ModerateContentInput {
  @Field(() => ID)
  @IsString()
  contentId: string;

  @Field()
  @IsBoolean()
  approved: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  moderatorNote?: string;
}

@InputType()
export class BatchModerateInput {
  @Field(() => [ID])
  @IsArray()
  contentIds: string[];

  @Field()
  @IsBoolean()
  approved: boolean;
}