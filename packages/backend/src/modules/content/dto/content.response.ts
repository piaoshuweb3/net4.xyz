import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { ContentType, ContentStatus } from '@prisma/client';

@ObjectType()
export class AuthorResponse {
  @Field(() => ID)
  id: string;

  @Field()
  address: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field({ nullable: true })
  bio?: string;
}

@ObjectType()
export class MediaResponse {
  @Field(() => ID)
  id: string;

  @Field()
  type: string;

  @Field()
  url: string;

  @Field({ nullable: true })
  ipfsHash?: string;

  @Field()
  filename: string;

  @Field({ nullable: true })
  mimeType?: string;

  @Field({ nullable: true })
  size?: number;

  @Field({ nullable: true })
  width?: number;

  @Field({ nullable: true })
  height?: number;
}

@ObjectType()
export class CommentResponse {
  @Field(() => ID)
  id: string;

  @Field()
  text: string;

  @Field(() => AuthorResponse)
  author: AuthorResponse;

  @Field(() => Int)
  likeCount: number;

  @Field()
  createdAt: Date;

  @Field(() => [CommentResponse], { nullable: true })
  replies?: CommentResponse[];
}

@ObjectType()
export class ContentResponse {
  @Field(() => ID)
  id: string;

  @Field(() => ContentType)
  type: ContentType;

  @Field()
  title: string;

  @Field({ nullable: true })
  summary?: string;

  @Field()
  content: string;

  @Field({ nullable: true })
  ipfsHash?: string;

  @Field({ nullable: true })
  chainHash?: string;

  @Field()
  isPremium: boolean;

  @Field({ nullable: true })
  price?: number;

  @Field(() => ContentStatus)
  status: ContentStatus;

  @Field(() => [String])
  tags: string[];

  @Field(() => Int)
  viewCount: number;

  @Field(() => Int)
  likeCount: number;

  @Field(() => Int)
  commentCount: number;

  @Field(() => AuthorResponse)
  author: AuthorResponse;

  @Field(() => [CommentResponse], { nullable: true })
  comments?: CommentResponse[];

  @Field(() => [MediaResponse], { nullable: true })
  media?: MediaResponse[];

  @Field({ nullable: true })
  publishedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  isLocked: boolean;
}

@ObjectType()
export class PaginatedContentsResponse {
  @Field(() => [ContentResponse])
  items: ContentResponse[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;
}

@ObjectType()
export class TagResponse {
  @Field()
  tag: string;

  @Field(() => Int)
  count: number;
}

@ObjectType()
export class ContentStatsResponse {
  @Field(() => Int)
  totalContents: number;

  @Field(() => Int)
  publishedContents: number;

  @Field(() => Int)
  pendingContents: number;

  @Field(() => Int)
  totalViews: number;

  @Field(() => Int)
  totalLikes: number;
}