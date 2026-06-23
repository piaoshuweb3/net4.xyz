import { InputType, Field, Float, Int } from '@nestjs/graphql';

// 书籍相关 DTO
@InputType()
export class CreateBookInput {
  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  coverImage?: string;

  @Field()
  content: string;

  @Field(() => Float)
  price: number;

  @Field(() => Float, { nullable: true })
  royaltyRate?: number;
}

@InputType()
export class UpdateBookInput {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  coverImage?: string;

  @Field({ nullable: true })
  content?: string;

  @Field(() => Float, { nullable: true })
  price?: number;

  @Field(() => Float, { nullable: true })
  royaltyRate?: number;
}

@InputType()
export class PublishBookInput {
  @Field()
  bookId: string;
}

@InputType()
export class ApproveBookInput {
  @Field()
  bookId: string;

  @Field()
  approved: boolean;
}

// 版权 NFT 相关 DTO
@InputType()
export class CreateCopyrightNFTInput {
  @Field()
  bookId: string;

  @Field(() => Float)
  price: number;

  @Field(() => Float, { nullable: true })
  royaltyRate?: number;
}

@InputType()
export class ListCopyrightNFTInput {
  @Field()
  nftId: string;

  @Field(() => Float)
  price: boolean;
}

@InputType()
export class BuyCopyrightNFTInput {
  @Field()
  nftId: string;

  @Field()
  buyerId: string;
}

// 打赏相关 DTO
@InputType()
export class CreateTipInput {
  @Field()
  receiverId: string;

  @Field()
  giverId: string;

  @Field(() => Float)
  amount: number;

  @Field({ nullable: true })
  message?: string;
}

// 收益结算相关 DTO
@InputType()
export class SettleRevenueInput {
  @Field()
  revenueId: string;
}

@InputType()
export class WithdrawRevenueInput {
  @Field()
  userId: string;
}

@InputType()
export class RevenueQueryInput {
  @Field({ nullable: true })
  userId?: string;

  @Field({ nullable: true })
  type?: string;

  @Field({ nullable: true })
  status?: string;

  @Field(() => Int, { nullable: true })
  page?: number;

  @Field(() => Int, { nullable: true })
  limit?: number;
}