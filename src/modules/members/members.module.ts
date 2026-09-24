import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { UsersController } from './users.controller';

@Module({
  controllers: [MembersController, UsersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
