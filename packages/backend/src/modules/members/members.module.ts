import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersResolver } from './members.resolver';

@Module({
  providers: [MembersService, MembersResolver],
  exports: [MembersService],
})
export class MembersModule {}