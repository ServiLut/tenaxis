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
          isObject && 'message' in data && typeof data.message === 'string'
            ? data.message
            : 'Success';

        // Extract data safely. If the returned object has a 'data' property, use it.
        const resultData =
          isObject && 'data' in data ? (data.data as T) : (data as T);

        return {
          statusCode,
          message,
          data: resultData,
        };
      }),
    );
  }
}
