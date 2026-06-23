import { Resolver, Query, Mutation, Args, ObjectType, Field, Int } from '@nestjs/graphql';
import { ArweaveService } from './arweave.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../gateway/guards/jwt-auth.guard';

@ObjectType()
export class ArweaveUploadResponse {
  @Field()
  transactionId: string;

  @Field(() => Int)
  timestamp: number;

  @Field(() => Int)
  size: number;

  @Field()
  gatewayUrl: string;

  @Field(() => [ArweaveTag])
  tags: Array<{ name: string; value: string }>;
}

@ObjectType()
export class ArweaveTag {
  @Field()
  name: string;

  @Field()
  value: string;
}

@ObjectType()
export class ArweaveFileResponse {
  @Field()
  transactionId: string;

  @Field(() => Int)
  timestamp: number;

  @Field(() => Int)
  size: number;

  @Field()
  gatewayUrl: string;

  @Field()
  filename: string;

  @Field()
  contentType: string;
}

@ObjectType()
export class ArweaveTransactionStatus {
  @Field(() => Int)
  status: number;

  @Field()
  confirmed: boolean;

  @Field(() => Int, { nullable: true })
  blockHeight?: number;

  @Field({ nullable: true })
  blockHash?: string;
}

@ObjectType()
export class ArweaveAttestation {
  @Field()
  transactionId: string;

  @Field()
  owner: string;

  @Field(() => Int)
  timestamp: number;

  @Field(() => Int)
  blockHeight: number;

  @Field()
  blockHash: string;

  @Field()
  dataHash: string;

  @Field(() => [ArweaveTag])
  tags: Array<{ name: string; value: string }>;

  @Field()
  verified: boolean;
}

@ObjectType()
export class ArweaveNetworkInfo {
  @Field()
  network: string;

  @Field()
  version: string;

  @Field(() => Int)
  height: number;

  @Field()
  release: string;
}

@ObjectType()
export class ArweaveConnectionStatus {
  @Field()
  connected: boolean;

  @Field()
  gatewayUrl: string;

  @Field({ nullable: true })
  walletAddress?: string;
}

@ObjectType()
export class ArweaveTransactionInfo {
  @Field()
  id: string;

  @Field(() => Int)
  timestamp: number;

  @Field()
  fee: string;

  @Field()
  quantity: string;
}

@Resolver(() => String)
export class ArweaveResolver {
  constructor(private readonly arweaveService: ArweaveService) {}

  @Query(() => ArweaveConnectionStatus)
  async arweaveStatus(): Promise<ArweaveConnectionStatus> {
    const walletAddress = await this.arweaveService.getWalletAddress();
    return {
      connected: this.arweaveService.isConnected(),
      gatewayUrl: this.arweaveService.getGatewayUrl(),
      walletAddress: walletAddress || undefined,
    };
  }

  @Query(() => ArweaveNetworkInfo)
  async arweaveNetworkInfo() {
    return this.arweaveService.getNetworkInfo();
  }

  @Query(() => String)
  async arweaveGatewayUrl(): Promise<string> {
    return this.arweaveService.getGatewayUrl();
  }

  @Query(() => String)
  async arweaveFileUrl(@Args('transactionId') transactionId: string): Promise<string> {
    return this.arweaveService.getFileUrl(transactionId);
  }

  @Query(() => ArweaveTransactionStatus)
  async arweaveTransactionStatus(@Args('transactionId') transactionId: string) {
    return this.arweaveService.getTransactionStatus(transactionId);
  }

  @Query(() => ArweaveAttestation)
  async arweaveAttestation(@Args('transactionId') transactionId: string) {
    return this.arweaveService.getAttestation(transactionId);
  }

  @Query(() => String)
  async arweaveBalance(): Promise<string> {
    return this.arweaveService.getBalance();
  }

  @Query(() => [String])
  async arweaveSearchByTag(
    @Args('tagName') tagName: string,
    @Args('tagValue') tagValue: string,
  ): Promise<string[]> {
    return this.arweaveService.searchByTag(tagName, tagValue);
  }

  @Query(() => [ArweaveTransactionInfo])
  async arweaveTransactions(
    @Args('address') address: string,
    @Args('limit', { nullable: true }) limit?: number,
  ): Promise<Array<{ id: string; timestamp: number; fee: string; quantity: string }>> {
    return this.arweaveService.getTransactions(address, limit);
  }

  @Query(() => String)
  async arweaveGetData(@Args('transactionId') transactionId: string): Promise<string> {
    return this.arweaveService.getData(transactionId);
  }

  @Query(() => String)
  async arweaveGetJson(@Args('transactionId') transactionId: string): Promise<string> {
    const json = await this.arweaveService.getJson(transactionId);
    return JSON.stringify(json);
  }

  @Query(() => [ArweaveTag])
  async arweaveGetTags(@Args('transactionId') transactionId: string) {
    return this.arweaveService.getTransactionTags(transactionId);
  }

  @Mutation(() => ArweaveUploadResponse)
  @UseGuards(GqlAuthGuard)
  async uploadToArweave(
    @Args('data', { type: () => String }) data: string,
    @Args('tags', { nullable: true }) tags?: string,
  ): Promise<{
    transactionId: string;
    timestamp: number;
    size: number;
    gatewayUrl: string;
    tags: Array<{ name: string; value: string }>;
  }> {
    const parsedTags = tags ? JSON.parse(tags) : [];
    return this.arweaveService.upload(data, parsedTags);
  }

  @Mutation(() => ArweaveUploadResponse)
  @UseGuards(GqlAuthGuard)
  async uploadJsonToArweave(
    @Args('data', { type: () => String }) data: string,
    @Args('tags', { nullable: true }) tags?: string,
  ): Promise<{
    transactionId: string;
    timestamp: number;
    size: number;
    gatewayUrl: string;
    tags: Array<{ name: string; value: string }>;
  }> {
    const json = JSON.parse(data);
    const parsedTags = tags ? JSON.parse(tags) : [];
    return this.arweaveService.uploadJson(json, parsedTags);
  }

  @Mutation(() => ArweaveFileResponse)
  @UseGuards(GqlAuthGuard)
  async uploadFileToArweave(
    @Args('content', { type: () => String }) content: string,
    @Args('filename') filename: string,
    @Args('contentType', { nullable: true }) contentType?: string,
  ): Promise<{
    transactionId: string;
    timestamp: number;
    size: number;
    gatewayUrl: string;
    filename: string;
    contentType: string;
  }> {
    const buffer = Buffer.from(content, 'base64');
    return this.arweaveService.uploadFile(buffer, filename, contentType);
  }
}