import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import {
  DependencyCheck,
  HealthController,
} from '../../../src/shared/infraestructura/health.controller';

describe('HealthController', () => {
  const createMockRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { res: { status } as unknown as Response, status, json };
  };

  it('debe responder 200 OK cuando PostgreSQL y Redis están activos', async () => {
    const dbCheck: DependencyCheck = { ping: jest.fn().mockResolvedValue(undefined) };
    const redisCheck: DependencyCheck = { ping: jest.fn().mockResolvedValue(undefined) };
    const controller = new HealthController(dbCheck, redisCheck);
    const { res, status, json } = createMockRes();

    await controller.check(res);

    expect(status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        checks: { postgres: 'up', redis: 'up' },
      }),
    );
  });

  it('debe responder 503 Service Unavailable cuando Redis falla', async () => {
    const dbCheck: DependencyCheck = { ping: jest.fn().mockResolvedValue(undefined) };
    const redisCheck: DependencyCheck = {
      ping: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    };
    const controller = new HealthController(dbCheck, redisCheck);
    const { res, status, json } = createMockRes();

    await controller.check(res);

    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'degraded',
        checks: { postgres: 'up', redis: 'down' },
      }),
    );
  });

  it('debe responder 503 Service Unavailable cuando PostgreSQL falla', async () => {
    const dbCheck: DependencyCheck = {
      ping: jest.fn().mockRejectedValue(new Error('PG down')),
    };
    const redisCheck: DependencyCheck = { ping: jest.fn().mockResolvedValue(undefined) };
    const controller = new HealthController(dbCheck, redisCheck);
    const { res, status, json } = createMockRes();

    await controller.check(res);

    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'degraded',
        checks: { postgres: 'down', redis: 'up' },
      }),
    );
  });
});
