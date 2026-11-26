import { Cita } from './cita.entity';

export const CITAS_REPOSITORY_PORT = 'CITAS_REPOSITORY_PORT';
export const DISTRIBUTED_LOCK_PORT = 'DISTRIBUTED_LOCK_PORT';

export interface SlotParaReserva {
  readonly id: string;
  readonly medicoId: string;
  readonly especialidadId: string;
  readonly fechaHoraInicio: Date;
  readonly estado: string;
  readonly agendaPublicada: boolean;
}

export interface TransaccionReservaContext {
  obtenerSlotParaReservaConBloqueo(slotId: string): Promise<SlotParaReserva | null>;
  marcarSlotReservado(slotId: string): Promise<void>;
  liberarSlot(slotId: string): Promise<void>;
  guardarCita(cita: Cita): Promise<void>;
  actualizarCita(cita: Cita): Promise<void>;
}

export interface CitaRepositoryPort {
  ejecutarEnTransaccion<T>(trabajo: (tx: TransaccionReservaContext) => Promise<T>): Promise<T>;
  buscarPorId(id: string): Promise<Cita | null>;
  listarPorPaciente(pacienteId: string): Promise<Cita[]>;
  listarAgendaMedica(medicoId: string, fecha: string): Promise<Cita[]>;
  existeCitaActivaPaciente(
    pacienteId: string,
    especialidadId: string,
    fecha: string,
  ): Promise<boolean>;
  contarSobrecuposDia(especialidadId: string, fecha: string): Promise<number>;
  obtenerMaxSobrecuposEspecialidad(especialidadId: string): Promise<number>;
  obtenerSlotInfo(slotId: string): Promise<SlotParaReserva | null>;
}

export interface DistributedLockPort {
  /**
   * Intenta adquirir un candado exclusivo. Retorna un token único si tuvo éxito, o null si está ocupado.
   */
  adquirirLock(recurso: string, ttlMs: number): Promise<string | null>;

  /**
   * Libera el candado solo si el token coincide con el propietario actual.
   */
  liberarLock(recurso: string, token: string): Promise<void>;
}
