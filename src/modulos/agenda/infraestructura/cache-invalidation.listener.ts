import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { EVENT_BUS, EventBusPort } from '../../../shared/eventos/domain-event';
import { REDIS_CLIENT } from '../../../shared/shared.module';
import { AGENDA_BLOQUEADA_EVENT } from '../dominio/estado-slot.vo';

export interface InvalidacionDisponibilidadPayload {
  readonly especialidadId: string;
  readonly fecha: string;
}

const EVENTOS_INVALIDACION = [
  AGENDA_BLOQUEADA_EVENT,
  'cita.reservada',
  'cita.cancelada',
  'cita.reprogramada',
] as const;

@Injectable()
export class CacheInvalidationListener implements OnModuleInit {
  private readonly logger = new Logger(CacheInvalidationListener.name);

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBusPort,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  onModuleInit(): void {
    for (const evento of EVENTOS_INVALIDACION) {
      this.eventBus.suscribir<InvalidacionDisponibilidadPayload>(evento, (evt) =>
        this.invalidarPorEspecialidadYFecha(evt.payload.especialidadId, evt.payload.fecha),
      );
    }
  }

  async invalidarPorEspecialidadYFecha(especialidadId: string, fecha: string): Promise<void> {
    if (!especialidadId || !fecha) return;
    const patron = `disp:${especialidadId}:${fecha}:*`;

    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', patron, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logger.warn(`Error al invalidar caché (${patron}): ${String(error)}`);
    }
  }
}
