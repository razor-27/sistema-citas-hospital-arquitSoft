import { randomUUID } from 'node:crypto';
import { Cita } from '../../../src/modulos/citas/dominio/cita.entity';
import {
  CitaRepositoryPort,
  DistributedLockPort,
  SlotParaReserva,
  TransaccionReservaContext,
} from '../../../src/modulos/citas/dominio/citas.ports';
import { EstadoCita } from '../../../src/modulos/citas/dominio/estado-cita.vo';

export class InMemoryDistributedLock implements DistributedLockPort {
  private readonly locks = new Map<string, string>();

  async adquirirLock(recurso: string): Promise<string | null> {
    if (this.locks.has(recurso)) {
      return null;
    }
    const token = randomUUID();
    this.locks.set(recurso, token);
    return token;
  }

  async liberarLock(recurso: string, token: string): Promise<void> {
    if (this.locks.get(recurso) === token) {
      this.locks.delete(recurso);
    }
  }
}

export class InMemoryCitaRepository implements CitaRepositoryPort {
  readonly citas = new Map<string, Cita>();
  readonly slots = new Map<string, { info: SlotParaReserva }>();
  maxSobrecupos = 2;

  seedSlot(slot: SlotParaReserva): void {
    this.slots.set(slot.id, { info: { ...slot } });
  }

  async ejecutarEnTransaccion<T>(
    trabajo: (tx: TransaccionReservaContext) => Promise<T>,
  ): Promise<T> {
    const tx: TransaccionReservaContext = {
      obtenerSlotParaReservaConBloqueo: async (slotId) => {
        const entry = this.slots.get(slotId);
        return entry ? { ...entry.info } : null;
      },
      marcarSlotReservado: async (slotId) => {
        const entry = this.slots.get(slotId);
        if (entry) {
          entry.info = { ...entry.info, estado: 'RESERVADO' };
        }
      },
      liberarSlot: async (slotId) => {
        const entry = this.slots.get(slotId);
        if (entry) {
          entry.info = { ...entry.info, estado: 'DISPONIBLE' };
        }
      },
      guardarCita: async (cita) => {
        this.citas.set(cita.id, cita);
      },
      actualizarCita: async (cita) => {
        this.citas.set(cita.id, cita);
      },
    };
    return trabajo(tx);
  }

  async buscarPorId(id: string): Promise<Cita | null> {
    return this.citas.get(id) ?? null;
  }

  async listarPorPaciente(pacienteId: string): Promise<Cita[]> {
    return [...this.citas.values()].filter((c) => c.pacienteId === pacienteId);
  }

  async listarAgendaMedica(medicoId: string, fecha: string): Promise<Cita[]> {
    return [...this.citas.values()].filter(
      (c) =>
        c.medicoId === medicoId &&
        c.fechaHoraInicio.toISOString().slice(0, 10) === fecha &&
        c.estado !== EstadoCita.CANCELADA,
    );
  }

  async existeCitaActivaPaciente(
    pacienteId: string,
    especialidadId: string,
    fecha: string,
  ): Promise<boolean> {
    return [...this.citas.values()].some(
      (c) =>
        c.pacienteId === pacienteId &&
        c.especialidadId === especialidadId &&
        c.fechaHoraInicio.toISOString().slice(0, 10) === fecha &&
        (c.estado === EstadoCita.RESERVADA ||
          c.estado === EstadoCita.CONFIRMADA ||
          c.estado === EstadoCita.EN_SALA),
    );
  }

  async contarSobrecuposDia(especialidadId: string, fecha: string): Promise<number> {
    return [...this.citas.values()].filter(
      (c) =>
        c.esSobrecupo &&
        c.especialidadId === especialidadId &&
        c.fechaHoraInicio.toISOString().slice(0, 10) === fecha &&
        c.estado !== EstadoCita.CANCELADA,
    ).length;
  }

  async obtenerMaxSobrecuposEspecialidad(): Promise<number> {
    return this.maxSobrecupos;
  }

  async obtenerSlotInfo(slotId: string): Promise<SlotParaReserva | null> {
    return this.slots.get(slotId)?.info ?? null;
  }
}
