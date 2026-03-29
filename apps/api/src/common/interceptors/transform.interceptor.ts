import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  meta?: any;
  statusCode: number;
  message?: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse<ExpressResponse>();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data: unknown): ApiResponse<T> => {
        const isObject = data !== null && typeof data === 'object';

        // Extract message safely
        const message =
          isObject && "message" in data && typeof data.message === "string"
            ? data.message
            : "Success";

        // Extract meta safely if it exists
        const meta = isObject && "meta" in data ? (data as any).meta : undefined;

        // Extract data safely. If the returned object has a 'data' property, use it.
        const resultData =
          isObject && "data" in data ? (data as any).data : (data as T);

        return {
          statusCode,
          message,
          data: resultData,
          meta,
        };
      }),
    );
  }
}
