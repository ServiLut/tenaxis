import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { MonitoringScope } from '../types';

export const GetScope = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): MonitoringScope => {
    const request = ctx.switchToHttp().getRequest();
    return request.monitoringScope;
  },
);
