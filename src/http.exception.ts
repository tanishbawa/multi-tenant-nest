import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  ExceptionFilter,
  Catch,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiErrorResponse } from './config/api-response';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: string[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errors = [exceptionResponse];
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObject = exceptionResponse as {
          message?: string | string[];
          error?: string;
        };

        if (Array.isArray(responseObject.message)) {
          errors = responseObject.message;
          message = responseObject.error ?? 'Validation failed';
        } else {
          message = responseObject.message ?? exception.message;
          errors = [message];
        }
      } else {
        message = exception.message;
        errors = [message];
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errors = [message];
    }

    if (errors.length === 0) {
      errors = [message];
    }

    const payload: ApiErrorResponse = {
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).send(payload);
  }
}
