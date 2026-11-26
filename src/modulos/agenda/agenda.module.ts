import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../shared/shared.module';
import { BloquearSlotsUseCase } from './aplicacion/bloquear-slots.use-case';
import { ConsultarDisponibilidadUseCase } from './aplicacion/consultar-disponibilidad.use-case';
import { CrearOfertaMedicaUseCase } from './aplicacion/crear-oferta-medica.use-case';
import { PublicarAgendaUseCase } from './aplicacion/publicar-agenda.use-case';
import { AGENDA_REPOSITORY_PORT } from './dominio/agenda-repository.port';
import { DISPONIBILIDAD_PORT } from './dominio/disponibilidad.port';
import { CacheInvalidationListener } from './infraestructura/cache-invalidation.listener';
import { CachedDisponibilidadDecorator } from './infraestructura/cached-disponibilidad.decorator';
import { PostgresAgendaRepository } from './infraestructura/postgres-agenda.repository';
import { PostgresDisponibilidadRepository } from './infraestructura/postgres-disponibilidad.repository';
import { AgendaController } from './presentacion/agenda.controller';

@Module({
  controllers: [AgendaController],
  providers: [
    ConsultarDisponibilidadUseCase,
    CrearOfertaMedicaUseCase,
    PublicarAgendaUseCase,
    BloquearSlotsUseCase,
    CacheInvalidationListener,
    PostgresDisponibilidadRepository,
    {
      provide: AGENDA_REPOSITORY_PORT,
      useClass: PostgresAgendaRepository,
    },
    {
      provide: DISPONIBILIDAD_PORT,
      inject: [PostgresDisponibilidadRepository, REDIS_CLIENT, ConfigService],
      useFactory: (pgRepo: PostgresDisponibilidadRepository, redis: Redis, config: ConfigService) =>
        new CachedDisponibilidadDecorator(pgRepo, redis, config.get<number>('CACHE_TTL_SEC', 60)),
    },
  ],
  exports: [ConsultarDisponibilidadUseCase],
})
export class AgendaModule {}
