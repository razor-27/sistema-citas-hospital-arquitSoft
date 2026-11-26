import { Logger } from '@nestjs/common';
import Redis from 'ioredis';
import {
  DisponibilidadPort,
  FiltroDisponibilidad,
  SlotDisponibleResumen,
} from '../dominio/disponibilidad.port';

/**
 * Patrón Decorator: agrega caché Cache-Aside en Redis con degradación fail-open.
 */
export class CachedDisponibilidadDecorator implements DisponibilidadPort {
  private readonly logger = new Logger(CachedDisponibilidadDecorator.name);

  constructor(
    private readonly inner: DisponibilidadPort,
    private readonly redis: Pick<Redis, 'get' | 'set'>,
    private readonly ttlSec = 60,
  ) {}

  async buscarDisponibles(filtro: FiltroDisponibilidad): Promise<SlotDisponibleResumen[]> {
    const cacheKey = CachedDisponibilidadDecorator.construirClave(filtro);

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached !== null) {
        return JSON.parse(cached) as SlotDisponibleResumen[];
      }
    } catch (error) {
      this.logger.warn(
        `Fallo al leer caché Redis (${cacheKey}), degradando a PostgreSQL: ${String(error)}`,
      );
    }

    const resultados = await this.inner.buscarDisponibles(filtro);

    try {
      await this.redis.set(cacheKey, JSON.stringify(resultados), 'EX', this.ttlSec);
    } catch (error) {
      this.logger.warn(`Fallo al escribir caché Redis (${cacheKey}): ${String(error)}`);
    }

    return resultados;
  }

  static construirClave(filtro: FiltroDisponibilidad): string {
    const medico = filtro.medicoId ?? 'all';
    const turno = filtro.turno ?? 'all';
    const sede = filtro.sedeId ?? 'all';
    return `disp:${filtro.especialidadId}:${filtro.fecha}:${medico}:${turno}:${sede}`;
  }
}
