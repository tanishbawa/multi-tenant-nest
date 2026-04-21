import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

export const ApiTenantHeader = () =>
  applyDecorators(
    ApiHeader({
      name: 'X-Tenant-Id',
      required: true,
      description: 'Tenant scope UUID for tenant-protected endpoints',
    }),
  );
