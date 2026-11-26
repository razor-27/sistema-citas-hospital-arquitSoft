import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import { AuditoriaRepositoryPort } from '../dominio/auditoria-repository.port';
import { JwtAuthGuard } from '../../auth/infraestructura/jwt-auth.guard';
import { RolesGuard } from '../../auth/infraestructura/roles.guard';
import { Roles } from '../../auth/infraestructura/roles.decorator';
import { AUDITORIA_REPOSITORY } from '../infraestructura/auditoria.listener';

@ApiTags('Auditoría')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/auditoria')
export class AuditoriaController {
  constructor(
    @Inject(AUDITORIA_REPOSITORY)
    private readonly auditoriaRepo: AuditoriaRepositoryPort,
  ) {}

  @Get('citas')
  @Roles('ADMIN', 'ADMISION')
  @ApiOperation({ summary: 'Consultar eventos de auditoría filtrados' })
  @ApiQuery({ name: 'citaId', required: false })
  @ApiQuery({ name: 'codigoReserva', required: false })
  @ApiQuery({ name: 'dni', required: false })
  @ApiResponse({ status: 200, description: 'Lista de eventos de auditoría' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  async consultar(
    @Query('citaId') citaId?: string,
    @Query('codigoReserva') codigoReserva?: string,
    @Query('dni') dni?: string,
  ) {
    if (citaId) return this.auditoriaRepo.buscarPorCitaId(citaId);
    if (codigoReserva) return this.auditoriaRepo.buscarPorCodigoReserva(codigoReserva);
    if (dni) return this.auditoriaRepo.buscarPorDni(dni);
    return [];
  }

  @Get('reportes/ocupacion')
  @Roles('ADMIN', 'ADMISION')
  @ApiOperation({ summary: 'Reporte de ocupación por operación en rango de fechas' })
  @ApiQuery({ name: 'desde', required: true, example: '2026-01-01' })
  @ApiQuery({ name: 'hasta', required: true, example: '2026-12-31' })
  @ApiResponse({ status: 200, description: 'Resumen de operaciones por tipo' })
  async reporteOcupacion(@Query('desde') desde: string, @Query('hasta') hasta: string) {
    return this.auditoriaRepo.reporteOcupacion(new Date(desde), new Date(hasta));
  }
}
