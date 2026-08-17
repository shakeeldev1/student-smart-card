import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { MulterError } from 'multer';

// Postgres error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_NOT_NULL_VIOLATION = '23502';

function mapDatabaseError(
  exception: QueryFailedError & { code?: string },
): { statusCode: number; message: string } | null {
  switch (exception.code) {
    case PG_UNIQUE_VIOLATION:
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'A record with this value already exists.',
      };
    case PG_FOREIGN_KEY_VIOLATION:
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'This action references a record that no longer exists.',
      };
    case PG_NOT_NULL_VIOLATION:
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'A required field is missing.',
      };
    default:
      return null;
  }
}

function mapMulterError(
  exception: MulterError,
): { statusCode: number; message: string } | null {
  switch (exception.code) {
    case 'LIMIT_FILE_SIZE':
      return {
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: 'This file is too large. Please choose a smaller file and try again.',
      };
    case 'LIMIT_UNEXPECTED_FILE':
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Unexpected file field. Please try again.',
      };
    default:
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'File upload failed. Please try again.',
      };
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const isMulterError = !isHttpException && exception instanceof MulterError;
    const dbError =
      !isHttpException && !isMulterError && exception instanceof QueryFailedError
        ? mapDatabaseError(exception as QueryFailedError & { code?: string })
        : null;
    const multerError = isMulterError
      ? mapMulterError(exception as MulterError)
      : null;

    const statusCode = isHttpException
      ? exception.getStatus()
      : (multerError?.statusCode ??
        dbError?.statusCode ??
        HttpStatus.INTERNAL_SERVER_ERROR);

    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message = isHttpException
      ? typeof exceptionResponse === 'object' && exceptionResponse
        ? ((exceptionResponse as Record<string, unknown>).message ??
          exception.message)
        : exception.message
      : (multerError?.message ?? dbError?.message ?? 'Internal server error');

    if (!isHttpException && !isMulterError) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error: isHttpException
        ? exception.name
        : multerError
          ? 'FileUploadError'
          : dbError
            ? 'DatabaseConstraintError'
            : 'InternalServerError',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
