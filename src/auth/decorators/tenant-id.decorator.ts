import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type TenantScopedRequest = {
  tenantId?: string;
};

export const TenantId = createParamDecorator(
  (_: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<TenantScopedRequest>();
    return request.tenantId ?? '';
  },
);
