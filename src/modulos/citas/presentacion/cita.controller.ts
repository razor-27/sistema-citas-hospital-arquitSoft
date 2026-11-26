import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CancelarCitaUseCase } from '../aplicacion/cancelar-cita.use-case';
import { CheckInUseCase } from '../aplicacion/check-in.use-case';
import { ConsultarCitasUseCase } from '../aplicacion/consultar-citas.use-case';
import {
  ActualizarEstadoClinicoDto,
  CancelarCitaDto,
  CitaQueryOpcionalDto,
  CitaResponseDto,
  ConsultarAgendaMedicaQueryDto,
  ReprogramarCitaDto,
  ReservarCitaDto,
} from '../aplicacion/dtos/citas.dtos';
import { ReprogramarCitaUseCase } from '../aplicacion/reprogramar-cita.use-case';
import { ReservarCitaUseCase } from '../aplicacion/reservar-cita.use-case';

interface RequestConUsuario extends Request {
  user?: { sub?: string; rol?: string };
}

@ApiTags('Citas Médicas')
@ApiBearerAuth()
@Controller('api/v1/citas')
export class CitaController {
  constructor(
    private readonly reservarCita: ReservarCitaUseCase,
    private readonly cancelarCita: CancelarCitaUseCase,
    private readonly reprogramarCita: ReprogramarCitaUseCase,
    private readonly checkInUseCase: CheckInUseCase,
    private readonly consultarCitas: ConsultarCitasUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Reservar cita médica atómicamente (Zero Double-Booking)' })
  @ApiResponse({ status: 201, description: 'Cita reservada con código único' })
  @ApiResponse({ status: 409, description: 'Cupo tomado concurrentemente' })
  @ApiResponse({ status: 422, description: 'Regla de negocio incumplida' })
  reservar(@Body() dto: ReservarCitaDto, @Req() req: RequestConUsuario): Promise<CitaResponseDto> {
    const actorId = req.user?.sub ?? dto.pacienteId;
    return this.reservarCita.ejecutar(dto, actorId, req.ip);
  }

  @Get('mias')
  @ApiOperation({ summary: 'Listar citas del paciente' })
  @ApiResponse({ status: 200, description: 'Listado de citas del paciente' })
  listarMias(
    @Query() query: CitaQueryOpcionalDto,
    @Req() req: RequestConUsuario,
  ): Promise<CitaResponseDto[]> {
    const pacienteId = req.user?.sub ?? query.pacienteId ?? '';
    return this.consultarCitas.listarPorPaciente(pacienteId);
  }

  @Get('agenda-medica')
  @ApiOperation({ summary: 'Tablero cronológico de citas del médico por fecha' })
  @ApiResponse({ status: 200, description: 'Agenda del día del profesional' })
  agendaMedica(@Query() query: ConsultarAgendaMedicaQueryDto): Promise<CitaResponseDto[]> {
    return this.consultarCitas.listarAgendaMedica(query.medicoId, query.fecha);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una cita (con control anti-IDOR)' })
  @ApiResponse({ status: 200, description: 'Detalle de cita' })
  @ApiResponse({ status: 403, description: 'Acceso denegado (IDOR)' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  obtenerPorId(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestConUsuario,
  ): Promise<CitaResponseDto> {
    const solicitanteId = req.user?.sub ?? '';
    const esPersonal = req.user?.rol !== undefined && req.user.rol !== 'PACIENTE';
    return this.consultarCitas.obtenerPorId(id, solicitanteId, esPersonal);
  }

  @Patch(':id/cancelar')
  @ApiOperation({ summary: 'Cancelar cita y liberar cupo inmediatamente' })
  @ApiResponse({ status: 200, description: 'Cita cancelada y cupo liberado' })
  cancelar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelarCitaDto,
    @Req() req: RequestConUsuario,
  ): Promise<CitaResponseDto> {
    const actorId = req.user?.sub ?? 'paciente';
    const esAdmision = req.user?.rol === 'ADMISION' || req.user?.rol === 'ADMIN';
    return this.cancelarCita.ejecutar(id, dto.motivo, actorId, esAdmision, req.ip);
  }

  @Patch(':id/reprogramar')
  @ApiOperation({ summary: 'Reprogramar cita a otro cupo libre de forma atómica' })
  @ApiResponse({ status: 200, description: 'Cita reprogramada' })
  @ApiResponse({ status: 409, description: 'El nuevo cupo ya fue ocupado' })
  reprogramar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReprogramarCitaDto,
    @Req() req: RequestConUsuario,
  ): Promise<CitaResponseDto> {
    const actorId = req.user?.sub ?? 'paciente';
    const esAdmision = req.user?.rol === 'ADMISION' || req.user?.rol === 'ADMIN';
    return this.reprogramarCita.ejecutar(id, dto.nuevoSlotId, actorId, esAdmision, req.ip);
  }

  @Patch(':id/check-in')
  @ApiOperation({ summary: 'Confirmar asistencia del paciente en sala (45-10 min previos)' })
  @ApiResponse({ status: 200, description: 'Check-in registrado (EN_SALA)' })
  checkIn(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestConUsuario,
  ): Promise<CitaResponseDto> {
    const actorId = req.user?.sub ?? 'recepcion';
    return this.checkInUseCase.ejecutar(id, actorId, new Date(), req.ip);
  }

  @Patch(':id/estado-clinico')
  @ApiOperation({ summary: 'Marcar cita como ATENDIDA o NO_ASISTIO (rol médico)' })
  @ApiResponse({ status: 200, description: 'Estado clínico actualizado' })
  actualizarEstadoClinico(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarEstadoClinicoDto,
    @Req() req: RequestConUsuario,
  ): Promise<CitaResponseDto> {
    const medicoId = req.user?.sub ?? 'medico';
    return this.consultarCitas.actualizarEstadoClinico(id, dto.accion, medicoId, req.ip);
  }
}
