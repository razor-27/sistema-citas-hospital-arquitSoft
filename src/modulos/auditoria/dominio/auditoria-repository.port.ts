export interface EventoAuditoria {
  citaId?: string;
  codigoReserva?: string;
  usuarioId?: string;
  usuarioDni?: string;
  ip?: string;
  operacion: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
  metadata?: Record<string, unknown>;
  ocurridoEn?: Date;
}

export abstract class AuditoriaRepositoryPort {
  abstract registrar(evento: EventoAuditoria): Promise<void>;
  abstract buscarPorCitaId(citaId: string): Promise<EventoAuditoria[]>;
  abstract buscarPorCodigoReserva(codigo: string): Promise<EventoAuditoria[]>;
  abstract buscarPorDni(dni: string): Promise<EventoAuditoria[]>;
  abstract reporteOcupacion(
    desde: Date,
    hasta: Date,
  ): Promise<{ operacion: string; total: number }[]>;
}
