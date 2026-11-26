import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { ConflictoConcurrenciaError } from '../../../shared/errores';
import { PG_POOL } from '../../../shared/shared.module';
import { Cita } from '../dominio/cita.entity';
import {
  CitaRepositoryPort,
  SlotParaReserva,
  TransaccionReservaContext,
} from '../dominio/citas.ports';
import { CodigoReserva } from '../dominio/codigo-reserva.vo';
import { EstadoCita } from '../dominio/estado-cita.vo';

interface CitaRow {
  id: string;
  codigo_reserva: string;
  paciente_id: string;
  slot_id: string;
  medico_id: string;
  especialidad_id: string;
  fecha_hora_inicio: Date;
  estado: EstadoCita;
  es_sobrecupo: boolean;
  motivo_sobrecupo: string | null;
  motivo_cancelacion: string | null;
  creado_por: string;
  created_at: Date;
  updated_at: Date;
}

class PostgresTransaccionContext implements TransaccionReservaContext {
  constructor(private readonly client: PoolClient) {}

  async obtenerSlotParaReservaConBloqueo(slotId: string): Promise<SlotParaReserva | null> {
    const { rows } = await this.client.query<{
      id: string;
      medico_id: string;
      especialidad_id: string;
      fecha_hora_inicio: Date;
      estado: string;
      publicada: boolean;
    }>(
      `SELECT s.id, s.medico_id, s.especialidad_id, s.fecha_hora_inicio, s.estado, a.publicada
       FROM turnos_slots s
       INNER JOIN agendas_medicas a ON a.id = s.agenda_id
       WHERE s.id = $1
       FOR UPDATE OF s`,
      [slotId],
    );

    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      medicoId: r.medico_id,
      especialidadId: r.especialidad_id,
      fechaHoraInicio: r.fecha_hora_inicio,
      estado: r.estado,
      agendaPublicada: r.publicada,
    };
  }

  async marcarSlotReservado(slotId: string): Promise<void> {
    await this.client.query(
      `UPDATE turnos_slots SET estado = 'RESERVADO', version = version + 1 WHERE id = $1`,
      [slotId],
    );
  }

  async liberarSlot(slotId: string): Promise<void> {
    await this.client.query(
      `UPDATE turnos_slots SET estado = 'DISPONIBLE', version = version + 1 WHERE id = $1 AND estado = 'RESERVADO'`,
      [slotId],
    );
  }

  async guardarCita(cita: Cita): Promise<void> {
    try {
      await this.client.query(
        `INSERT INTO citas
         (id, codigo_reserva, paciente_id, slot_id, medico_id, especialidad_id, fecha_hora_inicio, estado, es_sobrecupo, motivo_sobrecupo, motivo_cancelacion, creado_por, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          cita.id,
          cita.codigoReserva.valor,
          cita.pacienteId,
          cita.slotId,
          cita.medicoId,
          cita.especialidadId,
          cita.fechaHoraInicio,
          cita.estado,
          cita.esSobrecupo,
          cita.motivoSobrecupo,
          cita.motivoCancelacion,
          cita.creadoPor,
          cita.createdAt,
          cita.updatedAt,
        ],
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictoConcurrenciaError('El cupo ya fue asignado a otra cita activa.');
      }
      throw error;
    }
  }

  async actualizarCita(cita: Cita): Promise<void> {
    await this.client.query(
      `UPDATE citas
       SET slot_id = $2, fecha_hora_inicio = $3, estado = $4, motivo_cancelacion = $5, updated_at = $6
       WHERE id = $1`,
      [
        cita.id,
        cita.slotId,
        cita.fechaHoraInicio,
        cita.estado,
        cita.motivoCancelacion,
        cita.updatedAt,
      ],
    );
  }
}

@Injectable()
export class PostgresCitaRepository implements CitaRepositoryPort {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async ejecutarEnTransaccion<T>(
    trabajo: (tx: TransaccionReservaContext) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await trabajo(new PostgresTransaccionContext(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async buscarPorId(id: string): Promise<Cita | null> {
    const { rows } = await this.pool.query<CitaRow>(`SELECT * FROM citas WHERE id = $1`, [id]);
    return rows[0] ? this.mapear(rows[0]) : null;
  }

  async listarPorPaciente(pacienteId: string): Promise<Cita[]> {
    const { rows } = await this.pool.query<CitaRow>(
      `SELECT * FROM citas WHERE paciente_id = $1 ORDER BY fecha_hora_inicio DESC`,
      [pacienteId],
    );
    return rows.map((r) => this.mapear(r));
  }

  async listarAgendaMedica(medicoId: string, fecha: string): Promise<Cita[]> {
    const { rows } = await this.pool.query<CitaRow>(
      `SELECT * FROM citas
       WHERE medico_id = $1
         AND fecha_hora_inicio >= $2::timestamptz
         AND fecha_hora_inicio <= $3::timestamptz
         AND estado != 'CANCELADA'
       ORDER BY fecha_hora_inicio ASC`,
      [medicoId, `${fecha}T00:00:00.000Z`, `${fecha}T23:59:59.999Z`],
    );
    return rows.map((r) => this.mapear(r));
  }

  async existeCitaActivaPaciente(
    pacienteId: string,
    especialidadId: string,
    fecha: string,
  ): Promise<boolean> {
    const { rows } = await this.pool.query<{ existe: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM citas
         WHERE paciente_id = $1
           AND especialidad_id = $2
           AND fecha_hora_inicio >= $3::timestamptz
           AND fecha_hora_inicio <= $4::timestamptz
           AND estado IN ('RESERVADA', 'CONFIRMADA', 'EN_SALA')
       ) AS existe`,
      [pacienteId, especialidadId, `${fecha}T00:00:00.000Z`, `${fecha}T23:59:59.999Z`],
    );
    return Boolean(rows[0]?.existe);
  }

  async contarSobrecuposDia(especialidadId: string, fecha: string): Promise<number> {
    const { rows } = await this.pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM citas
       WHERE especialidad_id = $1
         AND es_sobrecupo = TRUE
         AND fecha_hora_inicio >= $2::timestamptz
         AND fecha_hora_inicio <= $3::timestamptz
         AND estado != 'CANCELADA'`,
      [especialidadId, `${fecha}T00:00:00.000Z`, `${fecha}T23:59:59.999Z`],
    );
    return Number(rows[0]?.total ?? 0);
  }

  async obtenerMaxSobrecuposEspecialidad(especialidadId: string): Promise<number> {
    const { rows } = await this.pool.query<{ max_sobrecupos_dia: number }>(
      `SELECT max_sobrecupos_dia FROM especialidades WHERE id = $1`,
      [especialidadId],
    );
    return rows[0]?.max_sobrecupos_dia ?? 0;
  }

  async obtenerSlotInfo(slotId: string): Promise<SlotParaReserva | null> {
    const { rows } = await this.pool.query<{
      id: string;
      medico_id: string;
      especialidad_id: string;
      fecha_hora_inicio: Date;
      estado: string;
      publicada: boolean;
    }>(
      `SELECT s.id, s.medico_id, s.especialidad_id, s.fecha_hora_inicio, s.estado, a.publicada
       FROM turnos_slots s
       INNER JOIN agendas_medicas a ON a.id = s.agenda_id
       WHERE s.id = $1`,
      [slotId],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      medicoId: r.medico_id,
      especialidadId: r.especialidad_id,
      fechaHoraInicio: r.fecha_hora_inicio,
      estado: r.estado,
      agendaPublicada: r.publicada,
    };
  }

  private mapear(r: CitaRow): Cita {
    return Cita.reconstruir({
      id: r.id,
      codigoReserva: CodigoReserva.crear(r.codigo_reserva),
      pacienteId: r.paciente_id,
      slotId: r.slot_id,
      medicoId: r.medico_id,
      especialidadId: r.especialidad_id,
      fechaHoraInicio: r.fecha_hora_inicio,
      estado: r.estado,
      esSobrecupo: r.es_sobrecupo,
      motivoSobrecupo: r.motivo_sobrecupo,
      motivoCancelacion: r.motivo_cancelacion,
      creadoPor: r.creado_por,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
  }
}
