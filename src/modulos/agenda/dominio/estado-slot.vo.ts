export enum EstadoSlot {
  DISPONIBLE = 'DISPONIBLE',
  BLOQUEADO_TEMP = 'BLOQUEADO_TEMP',
  RESERVADO = 'RESERVADO',
  BLOQUEADO = 'BLOQUEADO',
}

export enum TurnoDia {
  MANANA = 'MANANA',
  TARDE = 'TARDE',
}

export const AGENDA_BLOQUEADA_EVENT = 'agenda.bloqueada';

export interface AgendaBloqueadaPayload {
  readonly especialidadId: string;
  readonly medicoId: string;
  readonly fecha: string;
  readonly motivo: string;
  readonly slotsAfectados: number;
}
