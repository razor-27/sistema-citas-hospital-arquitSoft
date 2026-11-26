import { validateEnv } from '../../../src/shared/config/env.validation';

describe('validateEnv', () => {
  const baseEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/citas',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'secreto-super-seguro-para-pruebas',
  };

  it('debe retornar la configuración válida con valores por defecto', () => {
    const result = validateEnv(baseEnv);
    expect(result.PORT).toBe(3000);
    expect(result.LOCK_TTL_MS).toBe(10000);
    expect(result.CACHE_TTL_SEC).toBe(60);
    expect(result.NODE_ENV).toBe('development');
  });

  it('debe lanzar error si falta alguna variable crítica', () => {
    expect(() => validateEnv({ REDIS_URL: 'redis://localhost:6379' })).toThrow(
      /Faltan variables de entorno críticas: DATABASE_URL, JWT_SECRET/,
    );
  });

  it('debe lanzar error si PORT es inválido', () => {
    expect(() => validateEnv({ ...baseEnv, PORT: '70000' })).toThrow(/PORT inválido/);
  });

  it('debe lanzar error si LOCK_TTL_MS o CACHE_TTL_SEC son inválidos', () => {
    expect(() => validateEnv({ ...baseEnv, LOCK_TTL_MS: '-1' })).toThrow(/LOCK_TTL_MS inválido/);
    expect(() => validateEnv({ ...baseEnv, CACHE_TTL_SEC: '0' })).toThrow(/CACHE_TTL_SEC inválido/);
  });
});
