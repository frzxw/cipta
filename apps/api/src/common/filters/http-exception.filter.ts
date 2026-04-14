import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '../constants/app.constants';

interface ErrorResponseBody {
  message?: string | string[];
  error?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = this.extractRequestId(request);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorBody =
      exception instanceof HttpException
        ? (exception.getResponse() as ErrorResponseBody | string)
        : 'Internal server error';

    const message =
      typeof errorBody === 'string'
        ? errorBody
        : Array.isArray(errorBody.message)
          ? errorBody.message.join(', ')
          : (errorBody.message ?? 'Unexpected error');

    response.status(status).json({
      success: false,
      error: {
        code: this.getErrorCode(status),
        message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }

  private extractRequestId(req: Request): string {
    const header = req.headers[REQUEST_ID_HEADER];
    if (typeof header === 'string' && header.length > 0) {
      return header;
    }

    return randomUUID();
  }

  private getErrorCode(status: number): string {
    switch (status) {
      case 400:
        return 'VALIDATION_ERROR';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      case 429:
        return 'RATE_LIMITED';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
