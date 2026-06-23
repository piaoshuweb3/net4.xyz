import { InputType, Field } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';
import { MemberLevel, PaymentMethod } from '@prisma/client';

@InputType()
export class CreateMembershipInput {
  @Field(() => MemberLevel)
  @IsEnum(MemberLevel)
  level: MemberLevel;

  @Field(() => String)
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

@InputType()
export class VerifyMembershipInput {
  @Field(() => MemberLevel)
  @IsEnum(MemberLevel)
  requiredLevel: MemberLevel;
}