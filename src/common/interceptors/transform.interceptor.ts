import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
  message?: string;
  meta?: {
    timestamp: string;
    tenantId?: string;
    [key: string]: any;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((res) => {
        // If response already matches standard structure, return it
        if (res && typeof res === 'object' && 'success' in res && 'data' in res) {
          return res;
        }

        let data = res;
        let message = 'عملیات با موفقیت انجام شد';

        if (res && typeof res === 'object' && 'message' in res && 'data' in res) {
          message = res.message;
          data = res.data;
        }

        const tenantId = request?.tenant?.id || request?.tenantId;

        return {
          success: true,
          statusCode,
          data,
          message,
          meta: {
            timestamp: new Date().toISOString(),
            tenantId: tenantId || undefined,
          },
        };
      }),
    );
  }
}
