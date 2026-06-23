import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { DNSRecordType } from '@prisma/client';

@InputType()
export class RegisterDomainInput {
  @Field()
  @IsString()
  name: string;

  @Field(() => DNSRecordType)
  @IsEnum(DNSRecordType)
  recordType: DNSRecordType;

  @Field()
  @IsString()
  recordValue: string;
}

@InputType()
export class UpdateDomainInput {
  @Field(() => DNSRecordType, { nullable: true })
  @IsOptional()
  @IsEnum(DNSRecordType)
  recordType?: DNSRecordType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  recordValue?: string;
}