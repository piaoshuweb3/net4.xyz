import { Resolver, Query, Mutation, Args, Int, ObjectType, Field } from '@nestjs/graphql';
import { IpfsService } from './ipfs.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../gateway/guards/jwt-auth.guard';

@ObjectType()
export class IpfsUploadResponse {
  @Field()
  cid: string;

  @Field(() => Int)
  size: number;

  @Field()
  filename: string;

  @Field(() => Int)
  timestamp: number;

  @Field()
  gatewayUrl: string;
}

@ObjectType()
export class IpfsJsonResponse {
  @Field()
  cid: string;

  @Field(() => Int)
  size: number;

  @Field(() => Int)
  timestamp: number;

  @Field()
  gatewayUrl: string;
}

@ObjectType()
export class IpfsPinResponse {
  @Field()
  cid: string;

  @Field()
  pinned: boolean;
}

@ObjectType()
export class IpfsUnpinResponse {
  @Field()
  cid: string;

  @Field()
  unpinned: boolean;
}

@ObjectType()
export class IpfsPin {
  @Field()
  cid: string;

  @Field()
  type: string;
}

@ObjectType()
export class IpfsStats {
  @Field()
  cid: string;

  @Field(() => Int)
  size: number;

  @Field(() => Int)
  cumulativeSize: number;

  @Field(() => Int)
  blocks: number;

  @Field()
  type: string;
}

@ObjectType()
export class IpfsNodeId {
  @Field()
  id: string;

  @Field()
  agentVersion: string;

  @Field()
  protocolVersion: string;
}

@ObjectType()
export class IpfsPeer {
  @Field()
  addr: string;

  @Field()
  peer: string;
}

@ObjectType()
export class IpfsClusterPeerResponse {
  @Field()
  success: boolean;

  @Field()
  peer: string;
}

@ObjectType()
export class IpfsReplicateResponse {
  @Field()
  cid: string;

  @Field(() => Int)
  replicatedPeers: number;

  @Field(() => Int)
  failedPeers: number;
}

@ObjectType()
export class IpfsConnectionStatus {
  @Field()
  connected: boolean;

  @Field()
  gatewayUrl: string;
}

@Resolver(() => String)
export class IpfsResolver {
  constructor(private readonly ipfsService: IpfsService) {}

  @Query(() => IpfsConnectionStatus)
  async ipfsStatus(): Promise<IpfsConnectionStatus> {
    return {
      connected: this.ipfsService.isIpfsConnected(),
      gatewayUrl: this.ipfsService.getGatewayUrl(),
    };
  }

  @Query(() => IpfsNodeId, { nullable: true })
  async ipfsNodeId() {
    return this.ipfsService.getNodeId();
  }

  @Query(() => [IpfsPeer])
  async ipfsSwarmPeers() {
    return this.ipfsService.getSwarmPeers();
  }

  @Query(() => [String])
  async ipfsClusterPeers(): Promise<string[]> {
    return this.ipfsService.getClusterPeers();
  }

  @Query(() => [IpfsPin])
  async ipfsPins() {
    return this.ipfsService.listPins();
  }

  @Query(() => Boolean)
  async ipfsExists(@Args('cid') cid: string): Promise<boolean> {
    return this.ipfsService.exists(cid);
  }

  @Query(() => IpfsStats)
  async ipfsStats(@Args('cid') cid: string) {
    return this.ipfsService.getStats(cid);
  }

  @Query(() => String)
  async ipfsGatewayUrl(): Promise<string> {
    return this.ipfsService.getGatewayUrl();
  }

  @Query(() => String)
  async ipfsFileUrl(@Args('cid') cid: string): Promise<string> {
    return this.ipfsService.getFileUrl(cid);
  }

  @Mutation(() => IpfsUploadResponse)
  @UseGuards(GqlAuthGuard)
  async uploadToIpfs(
    @Args('content', { type: () => String }) content: string,
    @Args('filename', { nullable: true }) filename?: string,
  ): Promise<IpfsUploadResponse> {
    const buffer = Buffer.from(content, 'base64');
    const name = filename || `file-${Date.now()}`;
    return this.ipfsService.uploadFile(buffer, name);
  }

  @Mutation(() => IpfsJsonResponse)
  @UseGuards(GqlAuthGuard)
  async uploadJsonToIpfs(
    @Args('data', { type: () => String }) data: string,
  ): Promise<IpfsJsonResponse> {
    const json = JSON.parse(data);
    return this.ipfsService.uploadJson(json);
  }

  @Mutation(() => IpfsPinResponse)
  @UseGuards(GqlAuthGuard)
  async pinIpfsFile(@Args('cid') cid: string): Promise<IpfsPinResponse> {
    return this.ipfsService.pinFile(cid);
  }

  @Mutation(() => IpfsUnpinResponse)
  @UseGuards(GqlAuthGuard)
  async unpinIpfsFile(@Args('cid') cid: string): Promise<IpfsUnpinResponse> {
    return this.ipfsService.unpinFile(cid);
  }

  @Mutation(() => IpfsClusterPeerResponse)
  @UseGuards(GqlAuthGuard)
  async addIpfsClusterPeer(
    @Args('peerAddress') peerAddress: string,
  ): Promise<IpfsClusterPeerResponse> {
    return this.ipfsService.addClusterPeer(peerAddress);
  }

  @Mutation(() => IpfsReplicateResponse)
  @UseGuards(GqlAuthGuard)
  async replicateToIpfsCluster(@Args('cid') cid: string): Promise<IpfsReplicateResponse> {
    return this.ipfsService.replicateToCluster(cid);
  }
}