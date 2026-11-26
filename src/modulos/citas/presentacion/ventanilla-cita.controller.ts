import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CitaResponseDto, RegistrarSobrecupoDto } from '../aplicacion/dtos/citas.dtos';
import { RegistrarSobrecupoUseCase } from '../aplicacion/registrar-sobrecupo.use-case';

interface RequestConUsuario extends Request {
  user?: { sub?: string };
}

@ApiTags('Ventanilla y Admisión')
@ApiBearerAuth()
@Controller('api/v1/ventanilla/citas')
export class VentanillaCitaController {
  constructor(private readonly registrarSobrecupo: RegistrarSobrecupoUseCase) {}

  @Post('sobrecupo')
  @ApiOperation({ summary: 'Registrar cita de sobrecupo autorizada en ventanilla' })
  @ApiResponse({ status: 201, description: 'Sobrecupo registrado' })
  @ApiResponse({ status: 422, description: 'Límite diario de sobrecupos alcanzado' })
  crearSobrecupo(
    @Body() dto: RegistrarSobrecupoDto,
    @Req() req: RequestConUsuario,
  ): Promise<CitaResponseDto> {
    const admisionId = req.user?.sub ?? 'admision-ventanilla';
    return this.registrarSobrecupo.ejecutar(dto, admisionId, req.ip);
  }
}
