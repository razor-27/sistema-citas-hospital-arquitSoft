import { DominioError } from './regla-negocio.error';

/**
 * Error lanzado cuando una entidad o recurso solicitado no existe.
 */
export class RecursoNoEncontradoError extends DominioError {
  readonly codigo = 'RECURSO_NO_ENCONTRADO';
}
