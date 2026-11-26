import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import {
  ConflictoConcurrenciaError,
  RecursoNoEncontradoError,
  ReglaNegocioError,
} from '../../../src/shared/errores';
import { HttpExceptionFilter } from '../../../src/shared/infraestructura/http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }),
        getRequest: () => ({ method: 'POST', url: '/api/v1/citas' }),
      }),
    } as unknown as ArgumentsHost;
  });

  it('debe mapear ReglaNegocioError a HTTP 422', () => {
    filter.catch(new ReglaNegocioError('RN-01: Paciente requerido'), mockHost);
    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 422,
        errorCode: 'REGLA_NEGOCIO',
        message: 'RN-01: Paciente requerido',
      }),
    );
  });

  it('debe mapear ConflictoConcurrenciaError a HTTP 409', () => {
    filter.catch(new ConflictoConcurrenciaError('Cupo tomado por otro usuario'), mockHost);
    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        errorCode: 'CONFLICTO_CONCURRENCIA',
      }),
    );
  });

  it('debe mapear RecursoNoEncontradoError a HTTP 404', () => {
    filter.catch(new RecursoNoEncontradoError('Cita no encontrada'), mockHost);
    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        errorCode: 'RECURSO_NO_ENCONTRADO',
      }),
    );
  });

  it('debe respetar HttpException estándar de NestJS', () => {
    filter.catch(new BadRequestException(['slotId debe ser UUID']), mockHost);
    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        errorCode: 'HTTP_400',
        message: ['slotId debe ser UUID'],
      }),
    );
  });

  it('debe mapear errores desconocidos a HTTP 500', () => {
    filter.catch(new Error('Fallo inesperado'), mockHost);
    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        errorCode: 'ERROR_INTERNO',
      }),
    );
  });
});
