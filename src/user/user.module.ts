import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { RoleEntity } from '../roles/entities/role.entity';
import { AuthModule } from 'src/auth/auth.module';
import { QueueModule } from 'src/queue/queue.module';
import { TenantEntity } from 'src/tenant/entities/tenant.entity';
import { UserRoleEntity } from './entities/user-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RoleEntity, TenantEntity, UserRoleEntity]),
    AuthModule,
    QueueModule,
  ],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}
