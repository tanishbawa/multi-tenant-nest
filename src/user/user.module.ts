import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { RoleEntity } from '../roles/entities/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, RoleEntity])],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}
