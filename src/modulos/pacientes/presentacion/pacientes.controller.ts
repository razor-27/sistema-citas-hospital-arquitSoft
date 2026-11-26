import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ValidarIdentidadUseCase } from '../aplicacion/validar-identidad.use-case';
import { JwtAuthGuard } from '../../auth/infraestructura/jwt-auth.guard';
import { RolesGuard } from '../../auth/infraestructura/roles.guard';
import { Roles } from '../../auth/infraestructura/roles.decorator';

@ApiTags('Pacientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/pacientes')
export class PacientesController {
  constructor(private readonly validarIdentidadUC: ValidarIdentidadUseCase) {}

  @Post('validar-identidad/:dni')
  @Roles('ADMISION', 'ADMIN', 'PACIENTE')
  @ApiOperation({ summary: 'Validar identidad en RENIEC y cobertura en SIS (EQ-06)' })
  @ApiParam({ name: 'dni', example: '12345678' })
  @ApiResponse({
    status: 200,
    description: 'Resultado de validación (incluye fallback si RENIEC/SIS no disponible)',
  })
  async validarIdentidad(@Param('dni') dni: string) {
    return this.validarIdentidadUC.ejecutar(dni);
  }

  @Get('dni/:dni')
  @Roles('ADMISION', 'ADMIN')
  @ApiOperation({ summary: 'Consultar datos de paciente por DNI' })
  @ApiParam({ name: 'dni', example: '12345678' })
  @ApiResponse({ status: 200, description: 'Datos del paciente con cobertura' })
  async buscarPorDni(@Param('dni') dni: string) {
    return this.validarIdentidadUC.ejecutar(dni);
  }
}
