import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { EVENT_BUS, InMemoryEventBus } from './eventos/domain-event';

export const PG_POOL = 'PG_POOL';
export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
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
      provide: EVENT_BUS,
      useClass: InMemoryEventBus,
    },
  ],
  exports: [PG_POOL, REDIS_CLIENT, EVENT_BUS],
})
export class SharedModule {}
