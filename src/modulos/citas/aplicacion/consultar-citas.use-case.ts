import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { RecursoNoEncontradoError } from '../../../shared/errores';
import { EVENT_BUS, EventBusPort } from '../../../shared/eventos/domain-event';
import { CITAS_REPOSITORY_PORT, CitaRepositoryPort } from '../dominio/citas.ports';
import { CITA_ESTADO_CLINICO_EVENT, CitaEventoPayload } from '../dominio/estado-cita.vo';
import { AccionEstadoClinico, CitaResponseDto, toCitaResponse } from './dtos/citas.dtos';

@Injectable()
export class ConsultarCitasUseCase {
  constructor(
    @Inject(CITAS_REPOSITORY_PORT) private readonly citaRepo: CitaRepositoryPort,
    @Inject(EVENT_BUS) private readonly eventBus: EventBusPort,
  ) {}

  async listarPorPaciente(pacienteId: string): Promise<CitaResponseDto[]> {
    const citas = await this.citaRepo.listarPorPaciente(pacienteId);
    return citas.map(toCitaResponse);
  }

  async obtenerPorId(
    citaId: string,
    solicitanteId: string,
    esPersonalHospital = false,
  ): Promise<CitaResponseDto> {
    const cita = await this.citaRepo.buscarPorId(citaId);
    if (!cita) {
      throw new RecursoNoEncontradoError(`Cita ${citaId} no encontrada.`);
    }
    if (!esPersonalHospital && cita.pacienteId !== solicitanteId) {
      throw new ForbiddenException('No tiene autorización para consultar esta cita.');
    }
    return toCitaResponse(cita);
  }

  async listarAgendaMedica(medicoId: string, fecha: string): Promise<CitaResponseDto[]> {
    const citas = await this.citaRepo.listarAgendaMedica(medicoId, fecha);
    return citas.map(toCitaResponse);
  }

  async actualizarEstadoClinico(
    citaId: string,
    accion: AccionEstadoClinico,
    medicoActorId: string,
    ip?: string,
  ): Promise<CitaResponseDto> {
    const cita = await this.citaRepo.buscarPorId(citaId);
    if (!cita) {
      throw new RecursoNoEncontradoError(`Cita ${citaId} no encontrada.`);
    }

    const estadoAnterior = cita.estado;
    if (accion === AccionEstadoClinico.ATENDIDA) {
      cita.marcarAtendida();
    } else {
      cita.marcarNoAsistio();
    }

    await this.citaRepo.ejecutarEnTransaccion(async (tx) => {
      await tx.actualizarCita(cita);
    });

    await this.eventBus.publicar<CitaEventoPayload>({
      nombre: CITA_ESTADO_CLINICO_EVENT,
      ocurridoEn: new Date(),
      payload: {
        citaId: cita.id,
        codigoReserva: cita.codigoReserva.valor,
        pacienteId: cita.pacienteId,
        slotId: cita.slotId,
        medicoId: cita.medicoId,
        especialidadId: cita.especialidadId,
        fecha: cita.fechaHoraInicio.toISOString().slice(0, 10),
        estadoAnterior,
        estadoNuevo: cita.estado,
        actorId: medicoActorId,
        ip,
      },
    });

    return toCitaResponse(cita);
  }
}
