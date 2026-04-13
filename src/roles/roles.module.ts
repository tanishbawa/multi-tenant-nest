import { Module } from '@nestjs/common';
import { RoleEntity } from './entities/role.entity';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from 'src/permissions/entities/permissions.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity, PermissionEntity]),
    AuthModule,
  ],
  providers: [RolesService],
  controllers: [RolesController],
})
export class RolesModule {}
