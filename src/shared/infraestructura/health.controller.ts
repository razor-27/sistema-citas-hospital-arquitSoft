import { Controller, Get, HttpStatus, Inject, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

export const HEALTH_DB_CHECK = 'HEALTH_DB_CHECK';
export const HEALTH_REDIS_CHECK = 'HEALTH_REDIS_CHECK';

export interface DependencyCheck {
  ping(): Promise<void>;
}

export interface HealthStatusResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  checks: {
    postgres: 'up' | 'down';
    redis: 'up' | 'down';
  };
}

@ApiTags('Salud del Sistema')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(HEALTH_DB_CHECK) private readonly dbCheck: DependencyCheck,
    @Inject(HEALTH_REDIS_CHECK) private readonly redisCheck: DependencyCheck,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Verificar estado de salud de la API, PostgreSQL y Redis' })
  @ApiResponse({ status: 200, description: 'Sistema saludable' })
  @ApiResponse({ status: 503, description: 'Una o más dependencias no disponibles' })
  async check(@Res() res: Response): Promise<void> {
    const [pgOk, redisOk] = await Promise.all([
      this.verificar(this.dbCheck),
      this.verificar(this.redisCheck),
    ]);

    const saludable = pgOk && redisOk;
    const payload: HealthStatusResponse = {
      status: saludable ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        postgres: pgOk ? 'up' : 'down',
        redis: redisOk ? 'up' : 'down',
      },
    };

    res.status(saludable ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(payload);
  }

  private async verificar(dep: DependencyCheck): Promise<boolean> {
    try {
      await dep.ping();
      return true;
    } catch {
      return false;
    }
  }
}
