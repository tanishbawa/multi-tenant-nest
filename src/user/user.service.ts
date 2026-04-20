import {
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
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @InjectQueue(AUDIT_QUEUE_NAME)
    private readonly auditQueue: Queue<AuditJobData>,
  ) {}

  async getAllUsers(
    query: UserQueryDto,
    requesterUserId: string,
  ): Promise<PaginatedResult<User>> {
    if (!requesterUserId) {
      throw new ForbiddenException('Access denied');
    }

    const requester = await this.userRepository.findOne({
      where: { id: requesterUserId },
      select: ['id', 'tenant_id', 'is_active'],
    });

    if (!requester?.is_active) {
      throw new ForbiddenException('Access denied');
    }

    const listCacheKey = this.buildUserListCacheKey(
      requester.tenant_id,
      requesterUserId,
      query,
    );
    const cached = await this.getFromCache<PaginatedResult<User>>(listCacheKey);
    if (cached) {
      this.logger.debug(
        `cache.hit key_prefix=user:list tenant=${requester.tenant_id}`,
      );
      return cached;
    }
    this.logger.debug(
      `cache.miss key_prefix=user:list tenant=${requester.tenant_id}`,
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .orderBy('user.created_at', 'DESC')
      .addOrderBy('user.id', 'DESC') // stable pagination order
      .skip(skip)
      .take(limit);

    qb.andWhere('user.tenant_id = :tenantId', {
      tenantId: requester.tenant_id,
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
    await this.rememberUserListKey(requester.tenant_id, listCacheKey);

    return result;
  }

  async getUserDetails(id: string): Promise<User> {
    const detailCacheKey = this.buildUserDetailsCacheKey(id);
    const cached = await this.getFromCache<User>(detailCacheKey);
    if (cached) {
      this.logger.debug('cache.hit key_prefix=user:detail');
      return cached;
    }
    this.logger.debug('cache.miss key_prefix=user:detail');

    const user = await this.userRepository.findOne({
      where: { id: id },
      relations: ['role', 'role.permissions'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.setInCache(detailCacheKey, user, this.userDetailTtlMs);
    return user;
  }

  async addUser(
    userDto: UserCreateDto,
  ): Promise<{ message: string; user_id: string }> {
    if (
      await this.userRepository.findOne({ where: { email: userDto.email } })
    ) {
      throw new ConflictException('Email already exists');
    }

    const role = await this.roleRepository.findOne({
      where: { id: userDto.role_id },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const passwordHash: string = await bcrypt.hash(userDto.password, 10);

    const createdUser = this.userRepository.create({
      name: userDto.name,
      age: userDto.age,
      email: userDto.email,
      phone_no: userDto.phone_no,
      address: userDto.address,
      tenant_id: userDto.tenant_id,
      role,
      password_hash: passwordHash,
    });

    const savedUser: User = await this.userRepository.save(createdUser);
    await this.invalidateUserCache(savedUser.id, savedUser.tenant_id);
    await this.enqueueAuditEvent({
      event: 'user.created',
      userId: savedUser.id,
      actorUserId: savedUser.id,
      metadata: { tenant_id: savedUser.tenant_id, role_id: role.id },
      occurredAt: new Date().toISOString(),
    });

    return { message: 'User created successfully', user_id: savedUser.id };
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.delete(id);
    await this.invalidateUserCache(id, user.tenant_id);
    await this.enqueueAuditEvent({
      event: 'user.deleted',
      userId: id,
      metadata: { tenant_id: user.tenant_id },
      occurredAt: new Date().toISOString(),
    });

    return { message: 'User deleted successfully' };
  }

  async updateUser(
    userUpdateDto: UserUpdateDto,
    id: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: id },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    const previousTenantId = user.tenant_id;

    if (userUpdateDto.role_id !== undefined) {
      const role = await this.roleRepository.findOne({
        where: { id: userUpdateDto.role_id },
      });
      if (!role) {
        throw new NotFoundException('Role not found');
      }
      user.role = role;
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

    if (userUpdateDto.tenant_id !== undefined) {
      user.tenant_id = userUpdateDto.tenant_id;
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
    await this.invalidateUserCache(user.id, user.tenant_id);
    if (previousTenantId !== user.tenant_id) {
      await this.invalidateUserListByTenant(previousTenantId);
    }
    await this.enqueueAuditEvent({
      event: 'user.updated',
      userId: user.id,
      metadata: {
        tenant_id: user.tenant_id,
        previous_tenant_id: previousTenantId,
      },
      occurredAt: new Date().toISOString(),
    });

    return { message: 'User updated successfully' };
  }

  private buildUserListCacheKey(
    tenantId: number,
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

  private buildUserDetailsCacheKey(userId: string): string {
    return `user:detail:${userId}`;
  }

  private buildUserListIndexKey(tenantId: number): string {
    return `user:list:index:tenant:${tenantId}`;
  }

  private async rememberUserListKey(
    tenantId: number,
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
    tenantId: number,
  ): Promise<void> {
    await this.deleteFromCache(this.buildUserDetailsCacheKey(userId));
    await this.deleteFromCache(`perm:user:${userId}`);
    await this.invalidateUserListByTenant(tenantId);
  }

  private async invalidateUserListByTenant(tenantId: number): Promise<void> {
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
