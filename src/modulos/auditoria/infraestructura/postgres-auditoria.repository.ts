import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { AuditoriaRepositoryPort, EventoAuditoria } from '../dominio/auditoria-repository.port';
import { PG_POOL } from '../../../shared/shared.module';

@Injectable()
export class PostgresAuditoriaRepository implements AuditoriaRepositoryPort {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async registrar(evento: EventoAuditoria): Promise<void> {
    await this.pool.query(
      `INSERT INTO auditoria_eventos
         (cita_id, codigo_reserva, usuario_id, usuario_dni, ip, operacion,
          estado_anterior, estado_nuevo, metadata, ocurrido_en)
       VALUES ($1, $2, $3, $4, $5::inet, $6, $7, $8, $9, $10)`,
      [
        evento.citaId ?? null,
        evento.codigoReserva ?? null,
        evento.usuarioId ?? null,
        evento.usuarioDni ?? null,
        evento.ip ?? null,
        evento.operacion,
        evento.estadoAnterior ?? null,
        evento.estadoNuevo ?? null,
        JSON.stringify(evento.metadata ?? {}),
        evento.ocurridoEn ?? new Date(),
      ],
    );
  }

  async buscarPorCitaId(citaId: string): Promise<EventoAuditoria[]> {
    const result = await this.pool.query<Record<string, unknown>>(
      'SELECT * FROM auditoria_eventos WHERE cita_id = $1 ORDER BY ocurrido_en ASC',
      [citaId],
    );
    return result.rows.map(this.mapear);
  }

  async buscarPorCodigoReserva(codigo: string): Promise<EventoAuditoria[]> {
    const result = await this.pool.query<Record<string, unknown>>(
      'SELECT * FROM auditoria_eventos WHERE codigo_reserva = $1 ORDER BY ocurrido_en ASC',
      [codigo],
    );
    return result.rows.map(this.mapear);
  }

  async buscarPorDni(dni: string): Promise<EventoAuditoria[]> {
    const result = await this.pool.query<Record<string, unknown>>(
      'SELECT * FROM auditoria_eventos WHERE usuario_dni = $1 ORDER BY ocurrido_en DESC',
      [dni],
    );
    return result.rows.map(this.mapear);
  }

  async reporteOcupacion(
    desde: Date,
    hasta: Date,
  ): Promise<{ operacion: string; total: number }[]> {
    const result = await this.pool.query<{ operacion: string; total: string }>(
      `SELECT operacion, COUNT(*)::int AS total
       FROM auditoria_eventos
       WHERE ocurrido_en BETWEEN $1 AND $2
       GROUP BY operacion
       ORDER BY total DESC`,
      [desde, hasta],
    );
    return result.rows.map((r) => ({ operacion: r.operacion, total: parseInt(r.total, 10) }));
  }

  private mapear(row: Record<string, unknown>): EventoAuditoria {
    return {
      citaId: row['cita_id'] as string | undefined,
      codigoReserva: row['codigo_reserva'] as string | undefined,
      usuarioId: row['usuario_id'] as string | undefined,
      usuarioDni: row['usuario_dni'] as string | undefined,
      ip: row['ip'] as string | undefined,
      operacion: row['operacion'] as string,
      estadoAnterior: row['estado_anterior'] as string | undefined,
      estadoNuevo: row['estado_nuevo'] as string | undefined,
      metadata: row['metadata'] as Record<string, unknown>,
      ocurridoEn: row['ocurrido_en'] as Date,
    };
  }
}
