import { AgendaMedica } from './agenda-medica.entity';

export const AGENDA_REPOSITORY_PORT = 'AGENDA_REPOSITORY_PORT';

export interface BloquearSlotsCriterio {
  readonly medicoId: string;
  readonly fecha: string;
  readonly horaDesde?: string;
  readonly horaHasta?: string;
  readonly motivo: string;
}

export interface AgendaRepositoryPort {
  guardar(agenda: AgendaMedica): Promise<void>;
  buscarPorId(agendaId: string): Promise<AgendaMedica | null>;
  actualizarPublicacion(agendaId: string, publicada: boolean): Promise<void>;
  existeSolapamiento(
    medicoId: string,
    fecha: string,
    horaInicio: string,
    horaFin: string,
  ): Promise<boolean>;
  bloquearSlotsPorCriterio(criterio: BloquearSlotsCriterio): Promise<{
    especialidadId: string;
    slotsAfectados: number;
  }>;
}
