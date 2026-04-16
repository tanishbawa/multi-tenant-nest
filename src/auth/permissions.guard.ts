import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import type { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { PERMISSION_NAMES } from 'src/config/constants';
import { PERMISSIONS_KEY } from './decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);
  private readonly permissionCacheTtlMs = 30_000;

  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PERMISSION_NAMES[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { userId: string } }>();
    const userId = request.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const cacheKey = `perm:user:${userId}`;
    const cachedPermissions = await this.getCachedPermissions(cacheKey);

    if (cachedPermissions) {
      this.logger.debug('cache.hit key_prefix=perm:user');
      const granted = new Set(cachedPermissions);
      const allowed = required.every((name) => granted.has(name));
      if (!allowed) {
        throw new ForbiddenException('Insufficient permissions');
      }
      return true;
    }
    this.logger.debug('cache.miss key_prefix=perm:user');

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role', 'role.permissions'],
    });

    if (!user?.is_active || !user.role) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const permissions = (user.role.permissions ?? []).map(
      (permission) => permission.permission_name,
    ) as PERMISSION_NAMES[];
    await this.setCachedPermissions(cacheKey, permissions);

    const granted = new Set(permissions);
    const allowed = required.every((name) => granted.has(name));
    if (!allowed) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  private async getCachedPermissions(
    key: string,
  ): Promise<PERMISSION_NAMES[] | null> {
    try {
      return (await this.cacheManager.get<PERMISSION_NAMES[]>(key)) ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`cache.get_failed key=${key} reason=${message}`);
      return null;
    }
  }

  private async setCachedPermissions(
    key: string,
    permissions: PERMISSION_NAMES[],
  ): Promise<void> {
    try {
      await this.cacheManager.set(key, permissions, this.permissionCacheTtlMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`cache.set_failed key=${key} reason=${message}`);
    }
  }
}
