import { Inject, Injectable } from '@nestjs/common';
import { RecursoNoEncontradoError } from '../../../shared/errores';
import { EVENT_BUS, EventBusPort } from '../../../shared/eventos/domain-event';
import { CITAS_REPOSITORY_PORT, CitaRepositoryPort } from '../dominio/citas.ports';
import { CITA_CANCELADA_EVENT, CitaEventoPayload } from '../dominio/estado-cita.vo';
import { PoliticaReservaService } from '../dominio/politica-reserva.service';
import { CitaResponseDto, toCitaResponse } from './dtos/citas.dtos';

@Injectable()
export class CancelarCitaUseCase {
  constructor(
    @Inject(CITAS_REPOSITORY_PORT) private readonly citaRepo: CitaRepositoryPort,
    @Inject(EVENT_BUS) private readonly eventBus: EventBusPort,
    private readonly politica: PoliticaReservaService,
  ) {}

  async ejecutar(
    citaId: string,
    motivo: string,
    actorId: string,
    esAdmision = false,
    ip?: string,
  ): Promise<CitaResponseDto> {
    const cita = await this.citaRepo.buscarPorId(citaId);
    if (!cita) {
      throw new RecursoNoEncontradoError(`Cita ${citaId} no encontrada.`);
    }

    const estadoAnterior = cita.estado;
    this.politica.validarAnticipacionCambio(cita.fechaHoraInicio, new Date(), esAdmision);
    cita.cancelar(motivo);

    await this.citaRepo.ejecutarEnTransaccion(async (tx) => {
      await tx.actualizarCita(cita);
      if (!cita.esSobrecupo) {
        await tx.liberarSlot(cita.slotId);
      }
    });

    await this.eventBus.publicar<CitaEventoPayload>({
      nombre: CITA_CANCELADA_EVENT,
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
        actorId,
        ip,
      },
    });

    return toCitaResponse(cita);
  }
}
