import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UpdateUserInput, UpdateProfileInput, UserFilterInput } from './dto/users.input';
import { UserResponse, PaginatedUsersResponse, UserStatsResponse } from './dto/users.response';

@Resolver()
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  /**
   * 根据 ID 获取用户
   */
  @Query(() => UserResponse)
  async user(@Args('id', { type: () => ID }) id: string) {
    return this.usersService.findById(id);
  }

  /**
   * 根据钱包地址获取用户
   */
  @Query(() => UserResponse)
  async userByAddress(@Args('address') address: string) {
    return this.usersService.findByAddress(address);
  }

  /**
   * 获取用户列表
   */
  @Query(() => PaginatedUsersResponse)
  async users(
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('limit', { defaultValue: 20 }) limit: number,
  ) {
    return this.usersService.findAll(page, limit);
  }

  /**
   * 搜索用户
   */
  @Query(() => [UserResponse])
  async searchUsers(@Args('query') query: string, @Args('limit', { defaultValue: 20 }) limit: number) {
    return this.usersService.search(query, limit);
  }

  /**
   * 更新用户信息（需要认证）
   */
  @Mutation(() => UserResponse)
  @UseGuards(AuthGuard)
  async updateUser(
    @Context() context: any,
    @Args('input') input: UpdateUserInput,
  ) {
    return this.usersService.update(context.req.user.id, input);
  }

  /**
   * 更新用户资料（需要认证）
   */
  @Mutation(() => UserResponse)
  @UseGuards(AuthGuard)
  async updateProfile(
    @Context() context: any,
    @Args('input') input: UpdateProfileInput,
  ) {
    return this.usersService.updateProfile(context.req.user.id, input);
  }

  /**
   * 获取当前用户统计数据
   */
  @Query(() => UserStatsResponse)
  @UseGuards(AuthGuard)
  async myStats(@Context() context: any) {
    return this.usersService.getUserStats(context.req.user.id);
  }
}