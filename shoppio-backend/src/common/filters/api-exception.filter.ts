import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown;
    const extras: Partial<
      Pick<ApiErrorResponse['error'], 'upgradeRequired' | 'limit' | 'used' | 'plan'>
    > = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = HttpStatus[status] ?? 'HTTP_ERROR';
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as Record<string, unknown>;
        message = (body.message as string) || message;
        code = (body.error as string) || (body.code as string) || HttpStatus[status] || code;
        details = body.details;
        if (typeof body.upgradeRequired === 'boolean') {
          extras.upgradeRequired = body.upgradeRequired;
        }
        if (typeof body.limit === 'number') {
          extras.limit = body.limit;
        }
        if (typeof body.used === 'number') {
          extras.used = body.used;
        }
        if (typeof body.plan === 'string') {
          extras.plan = body.plan;
        }

        if (Array.isArray(body.message)) {
          message = 'Validation failed';
          details = body.message;
          code = 'VALIDATION_ERROR';
        }
      }
    } else if (exception instanceof Error) {
      if (
        exception.name === 'PayloadTooLargeError' ||
        exception.message.toLowerCase().includes('request entity too large')
      ) {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        code = 'PAYLOAD_TOO_LARGE';
        message = 'Sync payload is too large. Try syncing fewer products per batch.';
      }
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error('Unknown exception', String(exception));
    }

    const payload: ApiErrorResponse = {
      success: false,
      error: {
        code: String(code).toUpperCase().replace(/\s+/g, '_'),
        message,
        ...(details !== undefined ? { details } : {}),
        ...extras,
      },
    };

    response.status(status).json(payload);
  }
}
