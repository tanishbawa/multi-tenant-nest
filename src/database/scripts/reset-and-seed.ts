import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { TenantEntity } from '../../tenant/entities/tenant.entity';
import { PermissionEntity } from '../../permissions/entities/permissions.entity';
import { RoleEntity } from '../../roles/entities/role.entity';
import { User } from '../../user/entities/user.entity';
import { UserRoleEntity } from '../../user/entities/user-role.entity';
import { PERMISSION_NAMES } from '../../config/constants';

config({ path: '.env' });

type PermissionSeed = {
  code: string;
  description: string;
};

const defaultPermissionSeeds: PermissionSeed[] = [
  // Current API permission guard codes (must exist for current controllers).
  { code: PERMISSION_NAMES.CREATE_USER, description: 'Create users' },
  { code: PERMISSION_NAMES.READ_USER, description: 'Read users' },
  { code: PERMISSION_NAMES.UPDATE_USER, description: 'Update users' },
  { code: PERMISSION_NAMES.DELETE_USER, description: 'Delete users' },
  { code: PERMISSION_NAMES.CREATE_ROLE, description: 'Create roles' },
  { code: PERMISSION_NAMES.READ_ROLE, description: 'Read roles' },
  { code: PERMISSION_NAMES.UPDATE_ROLE, description: 'Update roles' },
  { code: PERMISSION_NAMES.DELETE_ROLE, description: 'Delete roles' },
  {
    code: PERMISSION_NAMES.CREATE_PERMISSION,
    description: 'Create permissions',
  },
  { code: PERMISSION_NAMES.READ_PERMISSION, description: 'Read permissions' },
  {
    code: PERMISSION_NAMES.UPDATE_PERMISSION,
    description: 'Update permissions',
  },
  {
    code: PERMISSION_NAMES.DELETE_PERMISSION,
    description: 'Delete permissions',
  },

  // Project-plan style resource.action permissions.
  { code: 'documents.read', description: 'Read documents' },
  { code: 'documents.write', description: 'Create/update documents' },
  { code: 'documents.delete', description: 'Delete documents' },
  { code: 'billing.read', description: 'View billing data' },
  { code: 'billing.write', description: 'Manage billing data' },
  { code: 'billing.delete', description: 'Delete billing entries' },
  { code: 'projects.read', description: 'Read projects' },
  { code: 'projects.write', description: 'Create/update projects' },
  { code: 'projects.delete', description: 'Delete projects' },
];

const getEnv = (key: string, fallback: string): string =>
  process.env[key]?.trim() || fallback;

async function truncateAllPublicTables(): Promise<void> {
  await dataSource.query(`
    DO $$
    DECLARE table_record RECORD;
    BEGIN
      FOR table_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename <> 'migrations'
      LOOP
        EXECUTE 'TRUNCATE TABLE "' || table_record.tablename || '" RESTART IDENTITY CASCADE';
      END LOOP;
    END
    $$;
  `);
}

async function run(): Promise<void> {
  await dataSource.initialize();

  try {
    await truncateAllPublicTables();

    const tenantRepository = dataSource.getRepository(TenantEntity);
    const permissionRepository = dataSource.getRepository(PermissionEntity);
    const roleRepository = dataSource.getRepository(RoleEntity);
    const userRepository = dataSource.getRepository(User);
    const userRoleRepository = dataSource.getRepository(UserRoleEntity);

    const tenantId = getEnv(
      'SEED_TENANT_ID',
      '00000000-0000-4000-8000-000000000001',
    );
    const ownerEmail = getEnv('SEED_OWNER_EMAIL', 'owner@example.com');
    const ownerPassword = getEnv('SEED_OWNER_PASSWORD', 'OwnerPass@123');
    const ownerName = getEnv('SEED_OWNER_NAME', 'Owner User');
    const ownerPhone = getEnv('SEED_OWNER_PHONE', '9999999999');
    const ownerAddress = getEnv('SEED_OWNER_ADDRESS', 'Seeded Owner Address');

    const tenant = await tenantRepository.save(
      tenantRepository.create({
        id: tenantId,
        name: getEnv('SEED_TENANT_NAME', 'Default Tenant'),
      }),
    );

    const permissions = await permissionRepository.save(
      defaultPermissionSeeds.map((item) =>
        permissionRepository.create({
          code: item.code,
          description: item.description,
        }),
      ),
    );

    const ownerRole = roleRepository.create({
      tenant,
      code: 'OWNER',
      name: 'Owner',
      built_in: true,
      permissions,
    });

    const adminRole = roleRepository.create({
      tenant,
      code: 'ADMIN',
      name: 'Admin',
      built_in: true,
      permissions: permissions.filter(
        (permission) =>
          permission.code !== PERMISSION_NAMES.DELETE_USER &&
          permission.code !== PERMISSION_NAMES.DELETE_ROLE &&
          permission.code !== PERMISSION_NAMES.DELETE_PERMISSION,
      ),
    });

    const userRole = roleRepository.create({
      tenant,
      code: 'USER',
      name: 'User',
      built_in: true,
      permissions: permissions.filter((permission) =>
        ['documents.read', 'projects.read', 'billing.read'].includes(
          permission.code,
        ),
      ),
    });

    const [savedOwnerRole, savedAdminRole, savedUserRole] =
      await roleRepository.save([ownerRole, adminRole, userRole]);

    const passwordHash = await bcrypt.hash(ownerPassword, 10);
    const ownerUser = await userRepository.save(
      userRepository.create({
        name: ownerName,
        age: 30,
        email: ownerEmail,
        phone_no: ownerPhone,
        address: ownerAddress,
        is_active: true,
        tenant,
        password_hash: passwordHash,
      }),
    );

    await userRoleRepository.save(
      userRoleRepository.create({
        user_id: ownerUser.id,
        role_id: savedOwnerRole.id,
        user: ownerUser,
        role: savedOwnerRole,
      }),
    );

    console.log('Database reset + seed completed.');
    console.log(`Tenant ID: ${tenant.id}`);
    console.log(`Owner email: ${ownerEmail}`);
    console.log(`Owner password: ${ownerPassword}`);
    console.log(
      `Built-in roles: ${savedOwnerRole.code}, ${savedAdminRole.code}, ${savedUserRole.code}`,
    );
    console.log(`Permissions seeded: ${permissions.length}`);
  } finally {
    await dataSource.destroy();
  }
}

void run();
