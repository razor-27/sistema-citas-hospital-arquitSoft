import { TurnoDia } from './estado-slot.vo';

export interface FiltroDisponibilidad {
  readonly especialidadId: string;
  readonly fecha: string; // YYYY-MM-DD
  readonly medicoId?: string;
  readonly turno?: TurnoDia;
  readonly sedeId?: string;
}

export interface SlotDisponibleResumen {
  readonly slotId: string;
  readonly agendaId: string;
  readonly medicoId: string;
  readonly especialidadId: string;
  readonly consultorioId: string;
  readonly sedeId: string;
  readonly fechaHoraInicio: string;
  readonly fechaHoraFin: string;
  readonly turno: TurnoDia;
}

export const DISPONIBILIDAD_PORT = 'DISPONIBILIDAD_PORT';

export interface DisponibilidadPort {
  buscarDisponibles(filtro: FiltroDisponibilidad): Promise<SlotDisponibleResumen[]>;
}
