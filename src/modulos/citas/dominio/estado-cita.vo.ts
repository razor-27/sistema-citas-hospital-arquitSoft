export enum EstadoCita {
  RESERVADA = 'RESERVADA',
  CONFIRMADA = 'CONFIRMADA',
  EN_SALA = 'EN_SALA',
  ATENDIDA = 'ATENDIDA',
  CANCELADA = 'CANCELADA',
  NO_ASISTIO = 'NO_ASISTIO',
}

export const CITA_RESERVADA_EVENT = 'cita.reservada';
export const CITA_CANCELADA_EVENT = 'cita.cancelada';
export const CITA_REPROGRAMADA_EVENT = 'cita.reprogramada';
export const CITA_CHECKIN_EVENT = 'cita.checkin';
export const CITA_ESTADO_CLINICO_EVENT = 'cita.estado_clinico';

export interface CitaEventoPayload {
  readonly citaId: string;
  readonly codigoReserva: string;
  readonly pacienteId: string;
  readonly slotId: string;
  readonly medicoId: string;
  readonly especialidadId: string;
  readonly fecha: string; // YYYY-MM-DD para invalidación de caché
  readonly estadoAnterior?: EstadoCita;
  readonly estadoNuevo: EstadoCita;
  readonly actorId: string;
  readonly ip?: string;
}
