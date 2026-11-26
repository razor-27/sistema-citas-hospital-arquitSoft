import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../shared/shared.module';
import { AgendaMedica, DuracionConsulta } from '../dominio/agenda-medica.entity';
import { AgendaRepositoryPort, BloquearSlotsCriterio } from '../dominio/agenda-repository.port';
import { EstadoSlot, TurnoDia } from '../dominio/estado-slot.vo';
import { TurnoSlot } from '../dominio/turno-slot.entity';

@Injectable()
export class PostgresAgendaRepository implements AgendaRepositoryPort {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async guardar(agenda: AgendaMedica): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO agendas_medicas
         (id, medico_id, especialidad_id, consultorio_id, fecha, hora_inicio, hora_fin, duracion_min, fecha_apertura, publicada)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          agenda.id,
          agenda.medicoId,
          agenda.especialidadId,
          agenda.consultorioId,
          agenda.fecha,
          agenda.horaInicio,
          agenda.horaFin,
          agenda.duracionMin,
          agenda.fechaApertura,
          agenda.publicada,
        ],
      );

      for (const slot of agenda.slots) {
        await client.query(
          `INSERT INTO turnos_slots
           (id, agenda_id, medico_id, especialidad_id, consultorio_id, sede_id, fecha_hora_inicio, fecha_hora_fin, turno, estado, version)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            slot.id,
            slot.agendaId,
            slot.medicoId,
            slot.especialidadId,
            slot.consultorioId,
            slot.sedeId,
            slot.fechaHoraInicio,
            slot.fechaHoraFin,
            slot.turno,
            slot.estado,
            slot.version,
          ],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async buscarPorId(agendaId: string): Promise<AgendaMedica | null> {
    const { rows } = await this.pool.query<{
      id: string;
      medico_id: string;
      especialidad_id: string;
      consultorio_id: string;
      fecha: Date;
      hora_inicio: string;
      hora_fin: string;
      duracion_min: number;
      fecha_apertura: Date;
      publicada: boolean;
    }>(`SELECT * FROM agendas_medicas WHERE id = $1`, [agendaId]);

    const row = rows[0];
    if (!row) return null;

    const slotsResult = await this.pool.query<{
      id: string;
      agenda_id: string;
      medico_id: string;
      especialidad_id: string;
      consultorio_id: string;
      sede_id: string;
      fecha_hora_inicio: Date;
      fecha_hora_fin: Date;
      turno: TurnoDia;
      estado: EstadoSlot;
      motivo_bloqueo: string | null;
      version: number;
    }>(`SELECT * FROM turnos_slots WHERE agenda_id = $1 ORDER BY fecha_hora_inicio ASC`, [
      agendaId,
    ]);

    const slots = slotsResult.rows.map((s) =>
      TurnoSlot.reconstruir({
        id: s.id,
        agendaId: s.agenda_id,
        medicoId: s.medico_id,
        especialidadId: s.especialidad_id,
        consultorioId: s.consultorio_id,
        sedeId: s.sede_id,
        fechaHoraInicio: s.fecha_hora_inicio,
        fechaHoraFin: s.fecha_hora_fin,
        turno: s.turno,
        estado: s.estado,
        motivoBloqueo: s.motivo_bloqueo,
        version: s.version,
      }),
    );

    const fechaStr =
      row.fecha instanceof Date ? row.fecha.toISOString().slice(0, 10) : String(row.fecha);

    return AgendaMedica.reconstruir({
      id: row.id,
      medicoId: row.medico_id,
      especialidadId: row.especialidad_id,
      consultorioId: row.consultorio_id,
      fecha: fechaStr,
      horaInicio: row.hora_inicio,
      horaFin: row.hora_fin,
      duracionMin: row.duracion_min as DuracionConsulta,
      fechaApertura: row.fecha_apertura,
      publicada: row.publicada,
      slots,
    });
  }

  async actualizarPublicacion(agendaId: string, publicada: boolean): Promise<void> {
    await this.pool.query(`UPDATE agendas_medicas SET publicada = $2 WHERE id = $1`, [
      agendaId,
      publicada,
    ]);
  }

  async existeSolapamiento(
    medicoId: string,
    fecha: string,
    horaInicio: string,
    horaFin: string,
  ): Promise<boolean> {
    const inicio = `${fecha}T${horaInicio}:00.000Z`;
    const fin = `${fecha}T${horaFin}:00.000Z`;
    const { rows } = await this.pool.query<{ existe: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM turnos_slots
         WHERE medico_id = $1
           AND fecha_hora_inicio < $3::timestamptz
           AND fecha_hora_fin > $2::timestamptz
       ) AS existe`,
      [medicoId, inicio, fin],
    );
    return Boolean(rows[0]?.existe);
  }

  async bloquearSlotsPorCriterio(criterio: BloquearSlotsCriterio): Promise<{
    especialidadId: string;
    slotsAfectados: number;
  }> {
    const desde = `${criterio.fecha}T${criterio.horaDesde ?? '00:00'}:00.000Z`;
    const hasta = `${criterio.fecha}T${criterio.horaHasta ?? '23:59'}:59.999Z`;

    const { rows } = await this.pool.query<{ especialidad_id: string }>(
      `UPDATE turnos_slots
       SET estado = 'BLOQUEADO', motivo_bloqueo = $4, version = version + 1
       WHERE medico_id = $1
         AND fecha_hora_inicio >= $2::timestamptz
         AND fecha_hora_inicio <= $3::timestamptz
         AND estado = 'DISPONIBLE'
       RETURNING especialidad_id`,
      [criterio.medicoId, desde, hasta, criterio.motivo],
    );

    return {
      especialidadId: rows[0]?.especialidad_id ?? '',
      slotsAfectados: rows.length,
    };
  }
}
