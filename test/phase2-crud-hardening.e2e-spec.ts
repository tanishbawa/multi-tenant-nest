import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { HttpExceptionFilter } from 'src/http.exception';
import { PermissionsController } from 'src/permissions/permissions.controller';
import { PermissionsService } from 'src/permissions/permissions.service';
import { RoleEntity } from 'src/roles/entities/role.entity';
import { RolesController } from 'src/roles/roles.controller';
import { RolesService } from 'src/roles/roles.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/permissions.guard';
import { TenantGuard } from 'src/auth/tenant.guard';
import { UserController } from 'src/user/user.controller';
import { UserService } from 'src/user/user.service';

class JwtAuthGuardMock implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string>;
      user?: { userId: string };
    }>();
    if (request.headers.authorization !== 'Bearer valid-token') {
      throw new UnauthorizedException('Unauthorized');
    }
    request.user = { userId: 'requester-id' };
    return true;
  }
}

class PermissionsGuardMock implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string> }>();
    if (request.headers['x-permission-allow'] !== 'true') {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}

class TenantGuardMock implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

type Mocked<T> = { [K in keyof T]?: jest.Mock };

describe('Phase 2 CRUD Hardening (e2e)', () => {
  let app: INestApplication<App>;
  let userService: Mocked<UserService>;
  let rolesService: Mocked<RolesService>;
  let permissionsService: Mocked<PermissionsService>;

  const validUserPayload = {
    name: 'Test User',
    age: 28,
    email: 'test.user@example.com',
    password: 'password123',
    phone_no: '1234567890',
    address: '123 Main St',
    role_id: '44106010-d79a-4263-b779-1851d63d4a22',
    tenant_id: '00000000-0000-4000-8000-000000000001',
  };

  beforeEach(async () => {
    userService = {
      getAllUsers: jest.fn().mockResolvedValue({
        data: [],
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      }),
      getUserDetails: jest.fn().mockResolvedValue({ id: 'user-1' }),
      addUser: jest.fn().mockResolvedValue({
        message: 'User created successfully',
        user_id: 'user-1',
      }),
      updateUser: jest
        .fn()
        .mockResolvedValue({ message: 'User updated successfully' }),
      deleteUser: jest
        .fn()
        .mockResolvedValue({ message: 'User deleted successfully' }),
    };

    rolesService = {
      getAllRoles: jest.fn().mockResolvedValue([
        {
          id: 'role-1',
          code: 'ADMIN',
          name: 'Admin',
          built_in: true,
        } as RoleEntity,
      ]),
      addRole: jest.fn().mockResolvedValue({
        id: 'role-2',
        code: 'EDITOR',
        name: 'Editor',
        built_in: false,
      }),
      editRole: jest
        .fn()
        .mockResolvedValue({ message: 'Role updated successfully' }),
      deleteRole: jest
        .fn()
        .mockResolvedValue({ message: 'Role deleted successfully' }),
    };

    permissionsService = {
      getAllPermissions: jest.fn().mockResolvedValue([]),
      createPermission: jest.fn().mockResolvedValue({
        id: 'perm-1',
        code: 'create_user',
        description: 'Create user permission',
      }),
      editPermission: jest
        .fn()
        .mockResolvedValue({ message: 'Permission updated successfully' }),
      deletePermission: jest
        .fn()
        .mockResolvedValue({ message: 'Permission deleted successfully' }),
    };

    const testingModuleBuilder = Test.createTestingModule({
      controllers: [UserController, RolesController, PermissionsController],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: RolesService, useValue: rolesService },
        { provide: PermissionsService, useValue: permissionsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(new JwtAuthGuardMock())
      .overrideGuard(TenantGuard)
      .useValue(new TenantGuardMock())
      .overrideGuard(PermissionsGuard)
      .useValue(new PermissionsGuardMock());

    const moduleFixture: TestingModule = await testingModuleBuilder.compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns unauthorized envelope when auth is missing', async () => {
    const response = await request(app.getHttpServer())
      .get('/permissions')
      .expect(401);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 401,
        message: 'Unauthorized',
        errors: ['Unauthorized'],
        path: '/permissions',
      }),
    );
  });

  it('returns forbidden envelope when permission guard blocks access', async () => {
    const response = await request(app.getHttpServer())
      .get('/permissions')
      .set('authorization', 'Bearer valid-token')
      .expect(403);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 403,
        message: 'Insufficient permissions',
        errors: ['Insufficient permissions'],
        path: '/permissions',
      }),
    );
  });

  it('returns normalized validation errors for invalid create user payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/user')
      .set('authorization', 'Bearer valid-token')
      .set('x-permission-allow', 'true')
      .send({
        ...validUserPayload,
        age: 'twenty',
        extra: 'not-allowed',
      })
      .expect(400);

    const body = response.body as {
      statusCode: number;
      message: string;
      errors: string[];
      path: string;
    };

    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('Bad Request');
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/age must be an integer number/),
        expect.stringMatching(/property extra should not exist/),
      ]),
    );
    expect(body.path).toBe('/user');
  });

  it('returns conflict status for duplicate user email', async () => {
    userService.addUser?.mockRejectedValueOnce(
      new ConflictException('Email already exists'),
    );

    const response = await request(app.getHttpServer())
      .post('/user')
      .set('authorization', 'Bearer valid-token')
      .set('x-permission-allow', 'true')
      .send(validUserPayload)
      .expect(409);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 409,
        message: 'Email already exists',
        errors: ['Email already exists'],
      }),
    );
  });

  it('returns not found status for missing role reference on user update', async () => {
    userService.updateUser?.mockRejectedValueOnce(
      new NotFoundException('Role not found'),
    );

    const response = await request(app.getHttpServer())
      .put('/user/user-1')
      .set('authorization', 'Bearer valid-token')
      .set('x-permission-allow', 'true')
      .send({ role_id: '7f9510e9-c99c-4721-b8f8-8f25d1304d26' })
      .expect(404);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 404,
        message: 'Role not found',
        errors: ['Role not found'],
      }),
    );
  });

  it('returns standardized success envelope for roles list', async () => {
    const response = await request(app.getHttpServer())
      .get('/roles')
      .set('authorization', 'Bearer valid-token')
      .set('x-permission-allow', 'true')
      .expect(200);

    expect(response.body).toEqual({
      message: 'Roles fetched successfully',
      data: [{ id: 'role-1', code: 'ADMIN', name: 'Admin', built_in: true }],
    });
  });

  it('returns standardized success envelope for permission create', async () => {
    const response = await request(app.getHttpServer())
      .post('/permissions')
      .set('authorization', 'Bearer valid-token')
      .set('x-permission-allow', 'true')
      .send({
        code: 'create_user',
        description: 'Create user permission',
      })
      .expect(201);

    expect(response.body).toEqual({
      message: 'Permission created successfully',
      data: {
        id: 'perm-1',
        code: 'create_user',
        description: 'Create user permission',
      },
    });
  });
});
