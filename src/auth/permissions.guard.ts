import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { PERMISSION_NAMES } from 'src/config/constants';
import { PERMISSIONS_KEY } from './decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role', 'role.permissions'],
    });

    if (!user?.is_active || !user.role) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const granted = new Set(
      (user.role.permissions ?? []).map((p) => p.permission_name),
    );
    const allowed = required.every((name) => granted.has(name));
    if (!allowed) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
