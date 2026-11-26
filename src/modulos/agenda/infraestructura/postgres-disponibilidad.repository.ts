import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../shared/shared.module';
import {
  DisponibilidadPort,
  FiltroDisponibilidad,
  SlotDisponibleResumen,
} from '../dominio/disponibilidad.port';
import { TurnoDia } from '../dominio/estado-slot.vo';

@Injectable()
export class PostgresDisponibilidadRepository implements DisponibilidadPort {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async buscarDisponibles(filtro: FiltroDisponibilidad): Promise<SlotDisponibleResumen[]> {
    const inicioDia = `${filtro.fecha}T00:00:00.000Z`;
    const finDia = `${filtro.fecha}T23:59:59.999Z`;

    const params: unknown[] = [filtro.especialidadId, inicioDia, finDia];
    let sql = `
      SELECT s.id AS slot_id,
             s.agenda_id,
             s.medico_id,
             s.especialidad_id,
             s.consultorio_id,
             s.sede_id,
             s.fecha_hora_inicio,
             s.fecha_hora_fin,
             s.turno
      FROM turnos_slots s
      INNER JOIN agendas_medicas a ON a.id = s.agenda_id
      WHERE s.especialidad_id = $1
        AND s.fecha_hora_inicio >= $2::timestamptz
        AND s.fecha_hora_inicio <= $3::timestamptz
        AND s.estado = 'DISPONIBLE'
        AND a.publicada = TRUE
    `;

    if (filtro.medicoId) {
      params.push(filtro.medicoId);
      sql += ` AND s.medico_id = $${params.length}`;
    }

    if (filtro.turno) {
      params.push(filtro.turno);
      sql += ` AND s.turno = $${params.length}`;
    }

    if (filtro.sedeId) {
      params.push(filtro.sedeId);
      sql += ` AND s.sede_id = $${params.length}`;
    }

    sql += ` ORDER BY s.fecha_hora_inicio ASC`;

    const { rows } = await this.pool.query<{
      slot_id: string;
      agenda_id: string;
      medico_id: string;
      especialidad_id: string;
      consultorio_id: string;
      sede_id: string;
      fecha_hora_inicio: Date;
      fecha_hora_fin: Date;
      turno: TurnoDia;
    }>(sql, params);

    return rows.map((r) => ({
      slotId: r.slot_id,
      agendaId: r.agenda_id,
      medicoId: r.medico_id,
      especialidadId: r.especialidad_id,
      consultorioId: r.consultorio_id,
      sedeId: r.sede_id,
      fechaHoraInicio:
        r.fecha_hora_inicio instanceof Date
          ? r.fecha_hora_inicio.toISOString()
          : String(r.fecha_hora_inicio),
      fechaHoraFin:
        r.fecha_hora_fin instanceof Date
          ? r.fecha_hora_fin.toISOString()
          : String(r.fecha_hora_fin),
      turno: r.turno,
    }));
  }
}
