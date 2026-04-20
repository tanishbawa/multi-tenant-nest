import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user/entities/user.entity';
import { RolesModule } from './roles/roles.module';
import { RoleEntity } from './roles/entities/role.entity';
import { PermissionsModule } from './permissions/permissions.module';
import { PermissionEntity } from './permissions/entities/permissions.entity';
import { AuthModule } from './auth/auth.module';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import KeyvRedis from '@keyv/redis';
import { Keyv } from 'keyv';
import { getRedisConfig, getRedisUrl } from './config/redis.config';
import { QueueModule } from './queue/queue.module';
import { TenantEntity } from './tenant/entities/tenant.entity';
import { UserRoleEntity } from './user/entities/user-role.entity';
import { PolicyEntity } from './policies/entities/policy.entity';
import { AuditLogEntity } from './audit/entities/audit-log.entity';
import { WebhookEndpointEntity } from './webhooks/entities/webhook-endpoint.entity';
import { WebhookDeliveryEntity } from './webhooks/entities/webhook-delivery.entity';
import { Phase3InitialSpecSchema1745123400000 } from './database/migrations/1745123400000-phase3-initial-spec-schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = getRedisConfig(configService);
        return {
          stores: [
            new Keyv({
              store: new KeyvRedis(getRedisUrl(redisConfig)),
            }),
          ],
        };
      },
    }),
    UserModule,
    RolesModule,
    PermissionsModule,
    AuthModule,
    QueueModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.SQL_HOST,
      port: Number(process.env.SQL_PORT),
      username: process.env.SQL_USERNAME,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DATABASE,
      entities: [
        User,
        UserRoleEntity,
        RoleEntity,
        PermissionEntity,
        RefreshToken,
        TenantEntity,
        PolicyEntity,
        AuditLogEntity,
        WebhookEndpointEntity,
        WebhookDeliveryEntity,
      ],
      migrations: [Phase3InitialSpecSchema1745123400000],
      migrationsRun: false,
      synchronize:
        (process.env.TYPEORM_SYNCHRONIZE ?? '').toLowerCase() === 'true',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
