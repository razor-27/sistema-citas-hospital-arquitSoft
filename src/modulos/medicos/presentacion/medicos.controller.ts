import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MedicosService } from '../aplicacion/medicos.service';
import { Especialidad, Medico } from '../dominio/medicos.entities';

@ApiTags('Médicos y Especialidades')
@Controller('api/v1/medicos')
export class MedicosController {
  constructor(private readonly medicosService: MedicosService) {}

  @Get('especialidades')
  @ApiOperation({ summary: 'Listar especialidades médicas activas' })
  @ApiResponse({ status: 200, description: 'Catálogo de especialidades activas' })
  listarEspecialidades(): Promise<Especialidad[]> {
    return this.medicosService.listarEspecialidades();
  }

  @Get()
  @ApiOperation({ summary: 'Listar médicos activos (opcionalmente por especialidad)' })
  @ApiQuery({ name: 'especialidadId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Listado de médicos' })
  listarMedicos(@Query('especialidadId') especialidadId?: string): Promise<Medico[]> {
    return this.medicosService.listarMedicos(especialidadId);
  }
}
