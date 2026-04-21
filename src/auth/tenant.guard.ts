import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

type TenantScopedRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: { userId: string };
  tenantId?: string;
};

const TENANT_HEADER_NAME = 'x-tenant-id';
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantScopedRequest>();
    const tenantHeaderValue = request.headers[TENANT_HEADER_NAME];
    const tenantId = Array.isArray(tenantHeaderValue)
      ? tenantHeaderValue[0]
      : tenantHeaderValue;

    if (!tenantId) {
      throw new BadRequestException('X-Tenant-Id header is required');
    }
    if (!UUID_V4_PATTERN.test(tenantId)) {
      throw new BadRequestException('X-Tenant-Id must be a valid UUID');
    }

    const userId = request.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Access denied');
    }

    const requester = await this.userRepository.findOne({
      where: {
        id: userId,
        tenant: { id: tenantId },
        is_active: true,
      },
      relations: ['tenant'],
    });
    if (!requester?.tenant) {
      throw new ForbiddenException('Access denied');
    }

    request.tenantId = tenantId;
    return true;
  }
}
