import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { UserRoleEntity } from '../user/entities/user-role.entity';
import { RoleEntity } from '../roles/entities/role.entity';
import { PermissionEntity } from '../permissions/entities/permissions.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { TenantEntity } from '../tenant/entities/tenant.entity';
import { PolicyEntity } from '../policies/entities/policy.entity';
import { AuditLogEntity } from '../audit/entities/audit-log.entity';
import { WebhookEndpointEntity } from '../webhooks/entities/webhook-endpoint.entity';
import { WebhookDeliveryEntity } from '../webhooks/entities/webhook-delivery.entity';
import { Phase3InitialSpecSchema1745123400000 } from './migrations/1745123400000-phase3-initial-spec-schema';

config({ path: '.env' });

export default new DataSource({
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
});
