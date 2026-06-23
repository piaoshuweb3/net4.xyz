import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { DNSRecordType } from '@prisma/client';

@ObjectType()
export class DomainOwnerResponse {
  @Field(() => ID)
  id: string;

  @Field()
  address: string;

  @Field({ nullable: true })
  email?: string;
}

@ObjectType()
export class DomainResponse {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  fullName: string;

  @Field(() => DNSRecordType)
  recordType: DNSRecordType;

  @Field()
  recordValue: string;

  @Field()
  expiryDate: Date;

  @Field(() => Int)
  price: number;

  @Field()
  isLocked: boolean;

  @Field({ nullable: true })
  lockReason?: string;

  @Field(() => DomainOwnerResponse)
  owner: DomainOwnerResponse;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class PaginatedDomainsResponse {
  @Field(() => [DomainResponse])
  items: DomainResponse[];

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
export class DomainResolveResponse {
  @Field()
  name: string;

  @Field()
  fullName: string;

  @Field(() => DNSRecordType)
  recordType: DNSRecordType;

  @Field()
  recordValue: string;

  @Field()
  owner: string;
}