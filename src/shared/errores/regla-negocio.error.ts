/**
 * Error base para excepciones puras del dominio clínico/negocio.
 */
export abstract class DominioError extends Error {
  abstract readonly codigo: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Error lanzado cuando se incumple una invariante o regla de negocio.
 */
export class ReglaNegocioError extends DominioError {
  readonly codigo = 'REGLA_NEGOCIO';
}
