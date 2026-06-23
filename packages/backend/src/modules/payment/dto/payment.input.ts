import { InputType, Field, Float } from '@nestjs/graphql';
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { MemberLevel, PaymentMethod } from '@prisma/client';

@InputType()
export class CreatePaymentInput {
  @Field(() => Float)
  @IsNumber()
  amount: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  fiatCurrency?: string;

  @Field()
  @IsString()
  walletAddress: string;

  @Field(() => MemberLevel)
  @IsEnum(MemberLevel)
  level: MemberLevel;

  @Field(() => String)
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  // 内部使用
  userId?: string;
  orderId?: string;
}

@InputType()
export class PaymentCallbackInput {
  @Field()
  @IsString()
  referenceId: string;

  @Field()
  @IsString()
  status: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cryptoTxHash?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  fiatAmount?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cryptoAmount?: string;
}