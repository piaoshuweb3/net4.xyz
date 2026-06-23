import { ObjectType, Field, ID } from '@nestjs/graphql';
import { MemberLevel } from '@prisma/client';

@ObjectType()
export class AuthUserResponse {
  @Field(() => ID)
  id: string;

  @Field()
  address: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  twitter?: string;

  @Field(() => MemberLevel)
  memberLevel: MemberLevel;

  @Field({ nullable: true })
  memberExpiry?: Date;

  @Field({ nullable: true })
  nodeId?: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field({ nullable: true })
  bio?: string;

  @Field()
  isVerified: boolean;

  @Field()
  isAdmin: boolean;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class AuthResponse {
  @Field(() => AuthUserResponse)
  user: AuthUserResponse;

  @Field()
  token: string;
}