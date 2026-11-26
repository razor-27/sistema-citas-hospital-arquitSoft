import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../shared/shared.module';
import { DistributedLockPort } from '../dominio/citas.ports';

const LUA_RELEASE_LOCK = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

/**
 * Adaptador de bloqueo distribuido en Redis mediante SET NX PX y liberación atómica Lua.
 */
@Injectable()
export class RedisDistributedLockAdapter implements DistributedLockPort {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Pick<Redis, 'set' | 'eval'>,
  ) {}

  async adquirirLock(recurso: string, ttlMs: number): Promise<string | null> {
    const token = randomUUID();
    const result = await this.redis.set(recurso, token, 'PX', ttlMs, 'NX');
    return result === 'OK' ? token : null;
  }

  async liberarLock(recurso: string, token: string): Promise<void> {
    await this.redis.eval(LUA_RELEASE_LOCK, 1, recurso, token);
  }
}
