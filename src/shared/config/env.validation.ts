export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  RABBITMQ_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  LOCK_TTL_MS: number;
  CACHE_TTL_SEC: number;
}

const REQUIRED_VARS = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET'] as const;

/**
 * Valida las variables de entorno requeridas al arranque (fail-fast).
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const missing = REQUIRED_VARS.filter((key) => {
    const val = config[key];
    return typeof val !== 'string' || val.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno críticas: ${missing.join(', ')}. Revisa tu archivo .env.`,
    );
  }

  const port = Number(config.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`PORT inválido: ${String(config.PORT)}`);
  }

  const lockTtlMs = Number(config.LOCK_TTL_MS ?? 10000);
  if (!Number.isFinite(lockTtlMs) || lockTtlMs <= 0) {
    throw new Error(`LOCK_TTL_MS inválido: ${String(config.LOCK_TTL_MS)}`);
  }

  const cacheTtlSec = Number(config.CACHE_TTL_SEC ?? 60);
  if (!Number.isFinite(cacheTtlSec) || cacheTtlSec <= 0) {
    throw new Error(`CACHE_TTL_SEC inválido: ${String(config.CACHE_TTL_SEC)}`);
  }

  return {
    NODE_ENV: String(config.NODE_ENV ?? 'development'),
    PORT: port,
    DATABASE_URL: String(config.DATABASE_URL),
    REDIS_URL: String(config.REDIS_URL),
    RABBITMQ_URL: String(config.RABBITMQ_URL ?? 'amqp://localhost:5672'),
    JWT_SECRET: String(config.JWT_SECRET),
    JWT_EXPIRES_IN: String(config.JWT_EXPIRES_IN ?? '1h'),
    LOCK_TTL_MS: lockTtlMs,
    CACHE_TTL_SEC: cacheTtlSec,
  };
}
