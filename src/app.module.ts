import { Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { validateEnv } from './shared/config/env.validation';
import {
  HEALTH_DB_CHECK,
  HEALTH_REDIS_CHECK,
  HealthController,
} from './shared/infraestructura/health.controller';

export const PG_POOL = 'PG_POOL';
export const REDIS_CLIENT = 'REDIS_CLIENT';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Pool =>
        new Pool({
          connectionString: config.getOrThrow<string>('DATABASE_URL'),
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 3000,
        }),
    },
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis =>
        new Redis(config.getOrThrow<string>('REDIS_URL'), {
          lazyConnect: true,
          maxRetriesPerRequest: 2,
          connectTimeout: 3000,
        }),
    },
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
  ],
  exports: [PG_POOL, REDIS_CLIENT],
})
export class AppModule implements OnModuleDestroy {
  constructor() {}

  onModuleDestroy(): void {
    // Los cierres ordenados de pools se gestionan vía lifecycle hooks en producción
  }
}
