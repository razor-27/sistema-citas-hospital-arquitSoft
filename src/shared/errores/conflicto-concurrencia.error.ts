import { DominioError } from './regla-negocio.error';

/**
 * Error lanzado cuando ocurre una colisión de concurrencia (ej. doble reserva de cupo).
 */
export class ConflictoConcurrenciaError extends DominioError {
  readonly codigo = 'CONFLICTO_CONCURRENCIA';
}
