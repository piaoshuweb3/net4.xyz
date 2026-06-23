import { Resolver, Query, Mutation, Args, ID, Context, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DomainService } from './domain.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RegisterDomainInput, UpdateDomainInput } from './dto/domain.input';
import { DomainResponse, PaginatedDomainsResponse } from './dto/domain.response';
import { DNSRecordType } from '@prisma/client';

@Resolver()
export class DomainResolver {
  constructor(private domainService: DomainService) {}

  /**
   * 检查域名可用性
   */
  @Query(() => Boolean)
  async checkDomainAvailability(@Args('name') name: string) {
    return this.domainService.checkAvailability(name);
  }

  /**
   * 获取域名价格
   */
  @Query(() => Int)
  async domainPrice(@Args('name') name: string) {
    return this.domainService.getDomainPrice(name);
  }

  /**
   * 解析域名
   */
  @Query(() => String)
  async resolveDomain(@Args('name') name: string) {
    return this.domainService.resolve(name);
  }

  /**
   * 获取域名详情
   */
  @Query(() => DomainResponse)
  async domain(@Args('id', { type: () => ID }) id: string) {
    return this.domainService.getById(id);
  }

  /**
   * 根据名称获取域名
   */
  @Query(() => DomainResponse)
  async domainByName(@Args('name') name: string) {
    return this.domainService.getByName(name);
  }

  /**
   * 获取域名列表
   */
  @Query(() => PaginatedDomainsResponse)
  async domains(
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('limit', { defaultValue: 20 }) limit: number,
  ) {
    return this.domainService.getList(page, limit);
  }

  /**
   * 搜索域名
   */
  @Query(() => PaginatedDomainsResponse)
  async searchDomains(
    @Args('query') query: string,
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('limit', { defaultValue: 20 }) limit: number,
  ) {
    return this.domainService.search(query, page, limit);
  }

  /**
   * 获取用户域名列表
   */
  @Query(() => [DomainResponse])
  @UseGuards(AuthGuard)
  async myDomains(@Context() context: any) {
    return this.domainService.getUserDomains(context.req.user.id);
  }

  /**
   * 注册域名
   */
  @Mutation(() => DomainResponse)
  @UseGuards(AuthGuard)
  async registerDomain(
    @Context() context: any,
    @Args('input') input: RegisterDomainInput,
  ) {
    return this.domainService.register(context.req.user.id, input);
  }

  /**
   * 续费域名
   */
  @Mutation(() => DomainResponse)
  @UseGuards(AuthGuard)
  async renewDomain(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
    @Args('years', { defaultValue: 1 }) years: number,
  ) {
    return this.domainService.renew(id, context.req.user.id, years);
  }

  /**
   * 更新域名解析记录
   */
  @Mutation(() => DomainResponse)
  @UseGuards(AuthGuard)
  async updateDomainRecord(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateDomainInput,
  ) {
    return this.domainService.updateRecord(id, context.req.user.id, input);
  }

  /**
   * 转让域名
   */
  @Mutation(() => DomainResponse)
  @UseGuards(AuthGuard)
  async transferDomain(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
    @Args('newOwnerId', { type: () => ID }) newOwnerId: string,
  ) {
    return this.domainService.transfer(id, context.req.user.id, newOwnerId);
  }

  /**
   * 锁定/解锁域名（管理员）
   */
  @Mutation(() => DomainResponse)
  @UseGuards(AuthGuard)
  async toggleDomainLock(
    @Args('id', { type: () => ID }) id: string,
    @Args('isLocked') isLocked: boolean,
    @Args('reason', { nullable: true }) reason?: string,
  ) {
    return this.domainService.toggleLock(id, isLocked, reason);
  }

  /**
   * 获取即将到期的域名
   */
  @Query(() => [DomainResponse])
  @UseGuards(AuthGuard)
  async expiringDomains(@Args('days', { defaultValue: 30 }) days: number) {
    return this.domainService.getExpiringDomains(days);
  }
}