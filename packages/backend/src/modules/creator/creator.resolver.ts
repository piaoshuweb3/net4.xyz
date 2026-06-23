import { Resolver, Query, Mutation, Args, Int, ObjectType, Field } from '@nestjs/graphql';
import { CreatorService } from './creator.service';
import { 
  CreateBookInput, 
  UpdateBookInput, 
  CreateCopyrightNFTInput,
  CreateTipInput,
  RevenueQueryInput 
} from './dto/creator.input';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../gateway/guards/jwt-auth.guard';
import { Public } from '../gateway/decorators/public.decorator';

// 返回类型定义
@ObjectType()
export class BookOutput {
  @Field()
  id: string;
  
  @Field()
  title: string;
  
  @Field({ nullable: true })
  description?: string;
  
  @Field({ nullable: true })
  coverImage?: string;
  
  @Field()
  content: string;
  
  @Field()
  price: number;
  
  @Field()
  royaltyRate: number;
  
  @Field()
  status: string;
  
  @Field()
  totalSales: number;
  
  @Field()
  totalRevenue: number;
  
  @Field({ nullable: true })
  publishedAt?: Date;
  
  @Field({ nullable: true })
  hasPurchased?: boolean;
  
  @Field(() => Object, { nullable: true })
  author?: any;
}

@ObjectType()
export class CopyrightNFTOutput {
  @Field()
  id: string;
  
  @Field()
  tokenId: string;
  
  @Field()
  price: number;
  
  @Field()
  royaltyRate: number;
  
  @Field()
  isListed: boolean;
  
  @Field(() => Object, { nullable: true })
  book?: any;
  
  @Field(() => Object, { nullable: true })
  owner?: any;
}

@ObjectType()
export class TipOutput {
  @Field()
  id: string;
  
  @Field()
  amount: number;
  
  @Field({ nullable: true })
  message?: string;
  
  @Field()
  status: string;
  
  @Field(() => Object, { nullable: true })
  giver?: any;
}

@ObjectType()
export class RevenueStatsOutput {
  @Field()
  totalRevenue: number;
  
  @Field()
  bookSaleRevenue: number;
  
  @Field()
  copyrightSaleRevenue: number;
  
  @Field()
  tipRevenue: number;
  
  @Field()
  royaltyRevenue: number;
  
  @Field()
  pendingSettlement: number;
  
  @Field()
  settled: number;
  
  @Field()
  withdrawn: number;
}

@ObjectType()
export class PaginatedOutput {
  @Field(() => Int)
  total: number;
  
  @Field(() => Int)
  page: number;
  
  @Field(() => Int)
  limit: number;
  
  @Field(() => Int)
  totalPages: number;
}

@Resolver(() => 'Creator')
export class CreatorResolver {
  constructor(private creatorService: CreatorService) {}

  // ==================== 书籍出版 ====================

  @Query(() => String)
  hello() {
    return 'Creator service is running';
  }

  @Query(() => BookOutput, { nullable: true })
  @Public()
  async getBook(@Args('bookId') bookId: string, @Args('userId', { nullable: true }) userId?: string) {
    return this.creatorService.getBookById(bookId, userId);
  }

  @Query(() => PaginatedOutput)
  @Public()
  async getBooks(
    @Args('status', { nullable: true }) status?: string,
    @Args('page', { nullable: true }) page?: number,
    @Args('limit', { nullable: true }) limit?: number,
  ) {
    return this.creatorService.getBooks(status as any, page, limit);
  }

  @Query(() => PaginatedOutput)
  async getAuthorBooks(
    @Args('authorId') authorId: string,
    @Args('page', { nullable: true }) page?: number,
    @Args('limit', { nullable: true }) limit?: number,
  ) {
    return this.creatorService.getAuthorBooks(authorId, page, limit);
  }

  @Query(() => [BookOutput])
  @Public()
  async getHotBooks(@Args('limit', { nullable: true }) limit?: number) {
    return this.creatorService.getHotBooks(limit);
  }

  @Query(() => [BookOutput])
  @Public()
  async getTopCreators(@Args('limit', { nullable: true }) limit?: number) {
    return this.creatorService.getTopCreators(limit);
  }

  @Mutation(() => BookOutput)
  @UseGuards(JwtAuthGuard)
  async createBook(
    @Args('authorId') authorId: string,
    @Args('input') input: CreateBookInput,
  ) {
    return this.creatorService.createBook(authorId, input);
  }

  @Mutation(() => BookOutput)
  @UseGuards(JwtAuthGuard)
  async updateBook(
    @Args('bookId') bookId: string,
    @Args('authorId') authorId: string,
    @Args('input') input: UpdateBookInput,
  ) {
    return this.creatorService.updateBook(bookId, authorId, input);
  }

  @Mutation(() => BookOutput)
  @UseGuards(JwtAuthGuard)
  async submitBookForReview(
    @Args('bookId') bookId: string,
    @Args('authorId') authorId: string,
  ) {
    return this.creatorService.submitBookForReview(bookId, authorId);
  }

  @Mutation(() => BookOutput)
  @UseGuards(JwtAuthGuard)
  async approveBook(
    @Args('bookId') bookId: string,
    @Args('approved') approved: boolean,
  ) {
    return this.creatorService.approveBook(bookId, approved);
  }

  @Mutation(() => String)
  @UseGuards(JwtAuthGuard)
  async purchaseBook(
    @Args('bookId') bookId: string,
    @Args('buyerId') buyerId: string,
    @Args('txHash', { nullable: true }) txHash?: string,
  ) {
    return this.creatorService.purchaseBook(bookId, buyerId, txHash);
  }

  // ==================== 版权 NFT ====================

  @Query(() => CopyrightNFTOutput, { nullable: true })
  @Public()
  async getCopyrightNFT(@Args('nftId') nftId: string) {
    return this.creatorService.getCopyrightNFTById(nftId);
  }

  @Query(() => PaginatedOutput)
  @Public()
  async getCopyrightNFTs(
    @Args('includeUnlisted', { nullable: true }) includeUnlisted?: boolean,
    @Args('page', { nullable: true }) page?: number,
    @Args('limit', { nullable: true }) limit?: number,
  ) {
    return this.creatorService.getCopyrightNFTs(includeUnlisted, page, limit);
  }

  @Mutation(() => CopyrightNFTOutput)
  @UseGuards(JwtAuthGuard)
  async createCopyrightNFT(
    @Args('ownerId') ownerId: string,
    @Args('input') input: CreateCopyrightNFTInput,
  ) {
    return this.creatorService.createCopyrightNFT(ownerId, input);
  }

  @Mutation(() => CopyrightNFTOutput)
  @UseGuards(JwtAuthGuard)
  async listCopyrightNFT(
    @Args('nftId') nftId: string,
    @Args('ownerId') ownerId: string,
    @Args('price') price: number,
  ) {
    return this.creatorService.listCopyrightNFT(nftId, ownerId, price);
  }

  @Mutation(() => String)
  @UseGuards(JwtAuthGuard)
  async purchaseCopyrightNFT(
    @Args('nftId') nftId: string,
    @Args('buyerId') buyerId: string,
    @Args('txHash', { nullable: true }) txHash?: string,
  ) {
    return this.creatorService.purchaseCopyrightNFT(nftId, buyerId, txHash);
  }

  // ==================== 打赏 ====================

  @Query(() => PaginatedOutput)
  async getUserTips(
    @Args('userId') userId: string,
    @Args('page', { nullable: true }) page?: number,
    @Args('limit', { nullable: true }) limit?: number,
  ) {
    return this.creatorService.getUserTips(userId, page, limit);
  }

  @Mutation(() => TipOutput)
  @UseGuards(JwtAuthGuard)
  async createTip(
    @Args('input') input: CreateTipInput,
    @Args('txHash', { nullable: true }) txHash?: string,
  ) {
    return this.creatorService.createTip(input, txHash);
  }

  // ==================== 收益结算 ====================

  @Query(() => RevenueStatsOutput)
  async getUserRevenueStats(@Args('userId') userId: string) {
    return this.creatorService.getUserRevenueStats(userId);
  }

  @Query(() => PaginatedOutput)
  async getRevenues(@Args('input') input: RevenueQueryInput) {
    return this.creatorService.getRevenues(input);
  }

  @Mutation(() => String)
  @UseGuards(JwtAuthGuard)
  async settleRevenue(@Args('revenueId') revenueId: string) {
    return this.creatorService.settleRevenue(revenueId);
  }

  @Mutation(() => String)
  @UseGuards(JwtAuthGuard)
  async batchSettleRevenues(@Args('userId') userId: string) {
    return this.creatorService.batchSettleRevenues(userId);
  }

  @Mutation(() => String)
  @UseGuards(JwtAuthGuard)
  async withdrawRevenue(
    @Args('userId') userId: string,
    @Args('toAddress') toAddress: string,
  ) {
    return this.creatorService.withdrawRevenue(userId, toAddress);
  }
}