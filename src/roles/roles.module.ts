import { Module } from '@nestjs/common';
import { RoleEntity } from './entities/role.entity';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from 'src/permissions/entities/permissions.entity';
import { AuthModule } from 'src/auth/auth.module';
import { TenantEntity } from 'src/tenant/entities/tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity, PermissionEntity, TenantEntity]),
    AuthModule,
  ],
  providers: [RolesService],
  controllers: [RolesController],
})
export class RolesModule {}
