import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedSite } from '../types/authenticated-site';

export const CurrentSite = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedSite => {
    const request = ctx.switchToHttp().getRequest<{ site: AuthenticatedSite }>();
    return request.site;
  },
);
