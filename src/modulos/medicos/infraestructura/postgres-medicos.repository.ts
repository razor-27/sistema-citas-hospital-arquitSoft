import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../shared/shared.module';
import { Consultorio, Especialidad, Medico } from '../dominio/medicos.entities';
import { MedicosRepositoryPort } from '../dominio/medicos-repository.port';

@Injectable()
export class PostgresMedicosRepository implements MedicosRepositoryPort {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async listarEspecialidadesActivas(): Promise<Especialidad[]> {
    const { rows } = await this.pool.query<{
      id: string;
      codigo: string;
      nombre: string;
      max_sobrecupos_dia: number;
      activo: boolean;
    }>(
      `SELECT id, codigo, nombre, max_sobrecupos_dia, activo
       FROM especialidades
       WHERE activo = TRUE
       ORDER BY nombre ASC`,
    );

    return rows.map((r) => ({
      id: r.id,
      codigo: r.codigo,
      nombre: r.nombre,
      maxSobrecuposDia: r.max_sobrecupos_dia,
      activo: r.activo,
    }));
  }

  async buscarEspecialidadPorId(id: string): Promise<Especialidad | null> {
    const { rows } = await this.pool.query<{
      id: string;
      codigo: string;
      nombre: string;
      max_sobrecupos_dia: number;
      activo: boolean;
    }>(
      `SELECT id, codigo, nombre, max_sobrecupos_dia, activo
       FROM especialidades WHERE id = $1`,
      [id],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      codigo: r.codigo,
      nombre: r.nombre,
      maxSobrecuposDia: r.max_sobrecupos_dia,
      activo: r.activo,
    };
  }

  async listarMedicos(especialidadId?: string): Promise<Medico[]> {
    const params: string[] = [];
    let sql = `SELECT id, cmp, nombres, apellidos, especialidad_id, activo
               FROM medicos WHERE activo = TRUE`;
    if (especialidadId) {
      params.push(especialidadId);
      sql += ` AND especialidad_id = $1`;
    }
    sql += ` ORDER BY apellidos ASC, nombres ASC`;

    const { rows } = await this.pool.query<{
      id: string;
      cmp: string;
      nombres: string;
      apellidos: string;
      especialidad_id: string;
      activo: boolean;
    }>(sql, params);

    return rows.map((r) => ({
      id: r.id,
      cmp: r.cmp,
      nombres: r.nombres,
      apellidos: r.apellidos,
      especialidadId: r.especialidad_id,
      activo: r.activo,
    }));
  }

  async buscarMedicoPorId(id: string): Promise<Medico | null> {
    const { rows } = await this.pool.query<{
      id: string;
      cmp: string;
      nombres: string;
      apellidos: string;
      especialidad_id: string;
      activo: boolean;
    }>(`SELECT id, cmp, nombres, apellidos, especialidad_id, activo FROM medicos WHERE id = $1`, [
      id,
    ]);
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      cmp: r.cmp,
      nombres: r.nombres,
      apellidos: r.apellidos,
      especialidadId: r.especialidad_id,
      activo: r.activo,
    };
  }

  async buscarConsultorioPorId(id: string): Promise<Consultorio | null> {
    const { rows } = await this.pool.query<{
      id: string;
      codigo: string;
      nombre: string;
      piso: string;
      sede_id: string;
      activo: boolean;
    }>(`SELECT id, codigo, nombre, piso, sede_id, activo FROM consultorios WHERE id = $1`, [id]);
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      codigo: r.codigo,
      nombre: r.nombre,
      piso: r.piso,
      sedeId: r.sede_id,
      activo: r.activo,
    };
  }
}
