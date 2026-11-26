import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { AgendaModule } from './modulos/agenda';
import { MedicosModule } from './modulos/medicos';
import { validateEnv } from './shared/config/env.validation';
import {
  HEALTH_DB_CHECK,
  HEALTH_REDIS_CHECK,
  HealthController,
} from './shared/infraestructura/health.controller';
import { PG_POOL, REDIS_CLIENT, SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    SharedModule,
    MedicosModule,
    AgendaModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: HEALTH_DB_CHECK,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => ({
        ping: async (): Promise<void> => {
          await pool.query('SELECT 1');
        },
      }),
    },
    {
      provide: HEALTH_REDIS_CHECK,
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) => ({
        ping: async (): Promise<void> => {
          await redis.ping();
        },
      }),
    },
    ConfigService,
  ],
})
export class AppModule {}
