import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenant = request.tenant || request.user?.tenant || (request.user?.tenantId ? { id: request.user?.tenantId } : undefined);
    return data ? tenant?.[data] : tenant;
  },
);
