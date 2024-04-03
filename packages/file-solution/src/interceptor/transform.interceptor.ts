import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    if (request.method === 'POST') {
      if (response.statusCode === HttpStatus.CREATED)
        context.switchToHttp().getResponse().status(HttpStatus.OK);
    }
    // return next.handle();
    return next.handle().pipe(
      map(data => {
        return {
          code: 200,
          success: true,
          message: 'success',
          data,
        };
      }),
    );
  }
}
