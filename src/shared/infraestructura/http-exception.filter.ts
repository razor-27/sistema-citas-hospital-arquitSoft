import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ConflictoConcurrenciaError,
  DominioError,
  RecursoNoEncontradoError,
  ReglaNegocioError,
} from '../errores';

const DOMINIO_HTTP_MAP = new Map<new (...args: never[]) => DominioError, HttpStatus>([
  [ReglaNegocioError, HttpStatus.UNPROCESSABLE_ENTITY],
  [ConflictoConcurrenciaError, HttpStatus.CONFLICT],
  [RecursoNoEncontradoError, HttpStatus.NOT_FOUND],
]);

/**
 * Traduce errores de dominio y excepciones HTTP a respuestas JSON uniformes.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, errorCode, message } = this.resolverRespuesta(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.url} -> ${status}: ${String(message)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      errorCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolverRespuesta(exception: unknown): {
    status: HttpStatus;
    errorCode: string;
    message: string | string[];
  } {
    if (exception instanceof DominioError) {
      for (const [ErrorClass, httpStatus] of DOMINIO_HTTP_MAP.entries()) {
        if (exception instanceof ErrorClass) {
          return {
            status: httpStatus,
            errorCode: exception.codigo,
            message: exception.message,
          };
        }
      }
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'object' && res !== null && 'message' in res
          ? ((res as { message: string | string[] }).message ?? exception.message)
          : exception.message;

      return {
        status,
        errorCode: `HTTP_${status}`,
        message,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'ERROR_INTERNO',
      message: 'Error interno del servidor',
    };
  }
}
