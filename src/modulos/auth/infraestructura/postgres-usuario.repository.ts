import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { Usuario, Rol } from '../dominio/usuario.entity';
import { UsuarioRepositoryPort } from '../dominio/usuario-repository.port';
import { PG_POOL } from '../../../shared/shared.module';

interface UsuarioRow {
  id: string;
  dni: string;
  email: string | null;
  password_hash: string;
  rol: string;
  activo: boolean;
  created_at: Date;
}

@Injectable()
export class PostgresUsuarioRepository implements UsuarioRepositoryPort {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async buscarPorDni(dni: string): Promise<Usuario | null> {
    const result = await this.pool.query<UsuarioRow>(
      'SELECT * FROM usuarios WHERE dni = $1 AND activo = TRUE LIMIT 1',
      [dni],
    );
    if (!result.rows.length) return null;
    return this.mapear(result.rows[0]);
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const result = await this.pool.query<UsuarioRow>(
      'SELECT * FROM usuarios WHERE id = $1 LIMIT 1',
      [id],
    );
    if (!result.rows.length) return null;
    return this.mapear(result.rows[0]);
  }

  async guardar(usuario: Usuario): Promise<void> {
    await this.pool.query(
      `INSERT INTO usuarios (id, dni, email, password_hash, rol, activo, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (dni) DO NOTHING`,
      [
        usuario.id,
        usuario.dni,
        usuario.email ?? null,
        usuario.passwordHash,
        usuario.rol,
        usuario.activo,
      ],
    );
  }

  async existeDni(dni: string): Promise<boolean> {
    const result = await this.pool.query<{ count: string }>(
      'SELECT COUNT(*)::int AS count FROM usuarios WHERE dni = $1',
      [dni],
    );
    return parseInt(result.rows[0].count, 10) > 0;
  }

  private mapear(row: UsuarioRow): Usuario {
    return new Usuario({
      id: row.id,
      dni: row.dni,
      email: row.email ?? undefined,
      passwordHash: row.password_hash,
      rol: row.rol as Rol,
      activo: row.activo,
      creadoEn: row.created_at,
    });
  }
}
