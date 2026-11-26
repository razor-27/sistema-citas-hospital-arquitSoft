import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BloquearSlotsUseCase } from '../aplicacion/bloquear-slots.use-case';
import { ConsultarDisponibilidadUseCase } from '../aplicacion/consultar-disponibilidad.use-case';
import {
  CrearOfertaMedicaUseCase,
  OfertaMedicaCreadaResponse,
} from '../aplicacion/crear-oferta-medica.use-case';
import {
  BloquearSlotsDto,
  ConsultarDisponibilidadDto,
  CrearOfertaMedicaDto,
} from '../aplicacion/dtos/agenda.dtos';
import { PublicarAgendaUseCase } from '../aplicacion/publicar-agenda.use-case';
import { SlotDisponibleResumen } from '../dominio/disponibilidad.port';

@ApiTags('Agenda y Disponibilidad')
@Controller('api/v1/agenda')
export class AgendaController {
  constructor(
    private readonly consultarDisponibilidad: ConsultarDisponibilidadUseCase,
    private readonly crearOfertaMedica: CrearOfertaMedicaUseCase,
    private readonly publicarAgenda: PublicarAgendaUseCase,
    private readonly bloquearSlots: BloquearSlotsUseCase,
  ) {}

  @Get('disponibilidad')
  @ApiOperation({ summary: 'Consultar turnos médicos disponibles (con caché Redis)' })
  @ApiResponse({ status: 200, description: 'Lista de cupos disponibles' })
  buscarDisponibilidad(
    @Query() query: ConsultarDisponibilidadDto,
  ): Promise<SlotDisponibleResumen[]> {
    return this.consultarDisponibilidad.ejecutar({
      especialidadId: query.especialidadId,
      fecha: query.fecha,
      medicoId: query.medicoId,
      turno: query.turno,
      sedeId: query.sedeId,
    });
  }

  @Post('ofertas')
  @ApiOperation({ summary: 'Crear oferta médica mensual y generar cupos horarios' })
  @ApiResponse({ status: 201, description: 'Oferta creada y cupos generados' })
  @ApiResponse({ status: 409, description: 'Solapamiento horario con otra oferta del médico' })
  crearOferta(@Body() dto: CrearOfertaMedicaDto): Promise<OfertaMedicaCreadaResponse> {
    return this.crearOfertaMedica.ejecutar(dto);
  }

  @Patch('ofertas/:id/publicar')
  @ApiOperation({ summary: 'Publicar agenda médica para apertura pública' })
  @ApiResponse({ status: 200, description: 'Agenda publicada exitosamente' })
  @ApiResponse({ status: 404, description: 'Agenda no encontrada' })
  publicar(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ agendaId: string; publicada: boolean }> {
    return this.publicarAgenda.ejecutar(id);
  }

  @Patch('slots/bloquear')
  @ApiOperation({ summary: 'Bloquear franja horaria por licencia, feriado o contingencia' })
  @ApiResponse({ status: 200, description: 'Cupos bloqueados y caché invalidada' })
  bloquear(@Body() dto: BloquearSlotsDto): Promise<{ slotsAfectados: number }> {
    return this.bloquearSlots.ejecutar(dto);
  }
}
