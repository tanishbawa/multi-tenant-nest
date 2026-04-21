import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UserCreateDto } from './dto/user.create.dto';
import { UserUpdateDto } from './dto/user.update.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleEntity } from '../roles/entities/role.entity';
import { TenantEntity } from 'src/tenant/entities/tenant.entity';
import { UserRoleEntity } from './entities/user-role.entity';
import * as bcrypt from 'bcrypt';
import { UserQueryDto } from './dto/user.query.dto';
import { PaginatedResult } from 'src/config/types';
import {
  AUDIT_JOB_NAME,
  AUDIT_QUEUE_NAME,
  AuditJobData,
} from 'src/queue/queue.constants';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly userListTtlMs = 60_000;
  private readonly userDetailTtlMs = 120_000;
  private readonly userListIndexTtlMs = 300_000;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @InjectQueue(AUDIT_QUEUE_NAME)
    private readonly auditQueue: Queue<AuditJobData>,
  ) {}

  async getAllUsers(
    query: UserQueryDto,
    requesterUserId: string,
    tenantId: string,
  ): Promise<PaginatedResult<User>> {
    await this.assertRequesterInTenant(requesterUserId, tenantId);

    const listCacheKey = this.buildUserListCacheKey(
      tenantId,
      requesterUserId,
      query,
    );
    const cached = await this.getFromCache<PaginatedResult<User>>(listCacheKey);
    if (cached) {
      this.logger.debug(`cache.hit key_prefix=user:list tenant=${tenantId}`);
      return cached;
    }
    this.logger.debug(`cache.miss key_prefix=user:list tenant=${tenantId}`);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.tenant', 'tenant')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .orderBy('user.created_at', 'DESC')
      .addOrderBy('user.id', 'DESC')
      .skip(skip)
      .take(limit);

    qb.andWhere('tenant.id = :tenantId', {
      tenantId,
    });

    if (search) {
      qb.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (query.is_active !== undefined) {
      qb.andWhere('user.is_active = :isActive', { isActive: query.is_active });
    }
    if (query.email) {
      qb.andWhere('user.email = :email', { email: query.email });
    }

    const [data, total] = await qb.getManyAndCount();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const result = {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    await this.setInCache(listCacheKey, result, this.userListTtlMs);
    await this.rememberUserListKey(tenantId, listCacheKey);

    return result;
  }

  async getUserDetails(
    id: string,
    requesterUserId: string,
    tenantId: string,
  ): Promise<User> {
    await this.assertRequesterInTenant(requesterUserId, tenantId);

    const detailCacheKey = this.buildUserDetailsCacheKey(id, tenantId);
    const cached = await this.getFromCache<User>(detailCacheKey);
    if (cached) {
      this.logger.debug('cache.hit key_prefix=user:detail');
      return cached;
    }
    this.logger.debug('cache.miss key_prefix=user:detail');

    const user = await this.userRepository.findOne({
      where: { id, tenant: { id: tenantId } },
      relations: [
        'tenant',
        'userRoles',
        'userRoles.role',
        'userRoles.role.permissions',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.setInCache(detailCacheKey, user, this.userDetailTtlMs);
    return user;
  }

  async addUser(
    userDto: UserCreateDto,
    requesterUserId: string,
    tenantId: string,
  ): Promise<{ message: string; user_id: string }> {
    await this.assertRequesterInTenant(requesterUserId, tenantId);

    if (
      await this.userRepository.findOne({ where: { email: userDto.email } })
    ) {
      throw new ConflictException('Email already exists');
    }

    if (userDto.tenant_id !== tenantId) {
      throw new BadRequestException('Body tenant_id must match X-Tenant-Id');
    }

    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const role = await this.roleRepository.findOne({
      where: { id: userDto.role_id },
      relations: ['tenant'],
    });
    if (!role?.tenant || role.tenant.id !== tenantId) {
      throw new NotFoundException('Role not found');
    }

    const passwordHash: string = await bcrypt.hash(userDto.password, 10);

    const createdUser = this.userRepository.create({
      name: userDto.name,
      age: userDto.age,
      email: userDto.email,
      phone_no: userDto.phone_no,
      address: userDto.address,
      tenant,
      password_hash: passwordHash,
    });

    const savedUser: User = await this.userRepository.save(createdUser);

    await this.userRoleRepository.save(
      this.userRoleRepository.create({
        user: savedUser,
        role,
      }),
    );

    await this.invalidateUserCache(savedUser.id, tenantId);
    await this.enqueueAuditEvent({
      event: 'user.created',
      userId: savedUser.id,
      actorUserId: requesterUserId,
      metadata: { tenant_id: tenantId, role_id: role.id },
      occurredAt: new Date().toISOString(),
    });

    return { message: 'User created successfully', user_id: savedUser.id };
  }

  async deleteUser(
    id: string,
    requesterUserId: string,
    tenantId: string,
  ): Promise<{ message: string }> {
    await this.assertRequesterInTenant(requesterUserId, tenantId);

    const user = await this.userRepository.findOne({
      where: { id, tenant: { id: tenantId } },
      relations: ['tenant'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.delete(id);
    await this.invalidateUserCache(id, tenantId);
    await this.enqueueAuditEvent({
      event: 'user.deleted',
      userId: id,
      metadata: { tenant_id: tenantId },
      occurredAt: new Date().toISOString(),
    });

    return { message: 'User deleted successfully' };
  }

  async updateUser(
    userUpdateDto: UserUpdateDto,
    id: string,
    requesterUserId: string,
    tenantId: string,
  ): Promise<{ message: string }> {
    await this.assertRequesterInTenant(requesterUserId, tenantId);

    const user = await this.userRepository.findOne({
      where: { id, tenant: { id: tenantId } },
      relations: ['tenant', 'userRoles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (userUpdateDto.role_id !== undefined) {
      const role = await this.roleRepository.findOne({
        where: { id: userUpdateDto.role_id },
        relations: ['tenant'],
      });
      if (!role?.tenant || role.tenant.id !== tenantId) {
        throw new NotFoundException('Role not found');
      }
      await this.userRoleRepository
        .createQueryBuilder()
        .delete()
        .from(UserRoleEntity)
        .where('user_id = :userId', { userId: user.id })
        .execute();
      await this.userRoleRepository.save(
        this.userRoleRepository.create({ user, role }),
      );
    }

    if (
      userUpdateDto.email !== undefined &&
      userUpdateDto.email.toLowerCase() !== user.email.toLowerCase()
    ) {
      const existingByEmail = await this.userRepository.findOne({
        where: { email: userUpdateDto.email },
        select: ['id'],
      });
      if (existingByEmail && existingByEmail.id !== user.id) {
        throw new ConflictException('Email already exists');
      }
    }

    if (
      userUpdateDto.tenant_id !== undefined &&
      userUpdateDto.tenant_id !== tenantId
    ) {
      throw new BadRequestException('Tenant change is not allowed');
    }

    if (userUpdateDto.name !== undefined) user.name = userUpdateDto.name;
    if (userUpdateDto.age !== undefined) user.age = userUpdateDto.age;
    if (userUpdateDto.email !== undefined) {
      user.email = userUpdateDto.email;
    }
    if (userUpdateDto.phone_no !== undefined)
      user.phone_no = userUpdateDto.phone_no;
    if (userUpdateDto.address !== undefined)
      user.address = userUpdateDto.address;
    if (userUpdateDto.password !== undefined) {
      const passwordHash: string = await bcrypt.hash(
        userUpdateDto.password,
        10,
      );
      user.password_hash = passwordHash;
    }

    await this.userRepository.save(user);
    await this.invalidateUserCache(user.id, tenantId);
    await this.enqueueAuditEvent({
      event: 'user.updated',
      userId: user.id,
      metadata: {
        tenant_id: tenantId,
      },
      occurredAt: new Date().toISOString(),
    });

    return { message: 'User updated successfully' };
  }

  private buildUserListCacheKey(
    tenantId: string,
    requesterUserId: string,
    query: UserQueryDto,
  ): string {
    const normalized = {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search?.trim() ?? '',
      is_active: query.is_active ?? null,
      email: query.email ?? '',
    };
    return `user:list:tenant:${tenantId}:requester:${requesterUserId}:${JSON.stringify(normalized)}`;
  }

  private buildUserDetailsCacheKey(userId: string, tenantId: string): string {
    return `user:detail:tenant:${tenantId}:${userId}`;
  }

  private buildUserListIndexKey(tenantId: string): string {
    return `user:list:index:tenant:${tenantId}`;
  }

  private async rememberUserListKey(
    tenantId: string,
    cacheKey: string,
  ): Promise<void> {
    const indexKey = this.buildUserListIndexKey(tenantId);
    const existingKeys = (await this.getFromCache<string[]>(indexKey)) ?? [];
    if (existingKeys.includes(cacheKey)) {
      return;
    }

    const updatedKeys = [...existingKeys, cacheKey];
    await this.setInCache(indexKey, updatedKeys, this.userListIndexTtlMs);
  }

  private async invalidateUserCache(
    userId: string,
    tenantId: string,
  ): Promise<void> {
    await this.deleteFromCache(this.buildUserDetailsCacheKey(userId, tenantId));
    await this.deleteFromCache(`perm:user:${userId}`);
    await this.deleteFromCache(`perm:user:${userId}:tenant:${tenantId}`);
    await this.invalidateUserListByTenant(tenantId);
  }

  private async assertRequesterInTenant(
    requesterUserId: string,
    tenantId: string,
  ): Promise<void> {
    if (!requesterUserId) {
      throw new ForbiddenException('Access denied');
    }

    const requester = await this.userRepository.findOne({
      where: {
        id: requesterUserId,
        tenant: { id: tenantId },
        is_active: true,
      },
      relations: ['tenant'],
    });

    if (!requester?.tenant) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async invalidateUserListByTenant(tenantId: string): Promise<void> {
    const indexKey = this.buildUserListIndexKey(tenantId);
    const keys = (await this.getFromCache<string[]>(indexKey)) ?? [];
    for (const key of keys) {
      await this.deleteFromCache(key);
    }
    await this.deleteFromCache(indexKey);
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      return (await this.cacheManager.get<T>(key)) ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`cache.get_failed key=${key} reason=${message}`);
      return null;
    }
  }

  private async setInCache<T>(
    key: string,
    value: T,
    ttlMs: number,
  ): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttlMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`cache.set_failed key=${key} reason=${message}`);
    }
  }

  private async deleteFromCache(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`cache.del_failed key=${key} reason=${message}`);
    }
  }

  private async enqueueAuditEvent(payload: AuditJobData): Promise<void> {
    try {
      await this.auditQueue.add(AUDIT_JOB_NAME, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(
        `queue.enqueue_failed queue=${AUDIT_QUEUE_NAME} event=${payload.event} reason=${message}`,
      );
    }
  }
}
