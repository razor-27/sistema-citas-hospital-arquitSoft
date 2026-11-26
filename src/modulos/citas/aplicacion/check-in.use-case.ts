import { Inject, Injectable } from '@nestjs/common';
import { RecursoNoEncontradoError } from '../../../shared/errores';
import { EVENT_BUS, EventBusPort } from '../../../shared/eventos/domain-event';
import { CITAS_REPOSITORY_PORT, CitaRepositoryPort } from '../dominio/citas.ports';
import { CITA_CHECKIN_EVENT, CitaEventoPayload } from '../dominio/estado-cita.vo';
import { PoliticaReservaService } from '../dominio/politica-reserva.service';
import { CitaResponseDto, toCitaResponse } from './dtos/citas.dtos';

@Injectable()
export class CheckInUseCase {
  constructor(
    @Inject(CITAS_REPOSITORY_PORT) private readonly citaRepo: CitaRepositoryPort,
    @Inject(EVENT_BUS) private readonly eventBus: EventBusPort,
    private readonly politica: PoliticaReservaService,
  ) {}

  async ejecutar(
    citaId: string,
    actorId: string,
    ahora = new Date(),
    ip?: string,
  ): Promise<CitaResponseDto> {
    const cita = await this.citaRepo.buscarPorId(citaId);
    if (!cita) {
      throw new RecursoNoEncontradoError(`Cita ${citaId} no encontrada.`);
    }

    const estadoAnterior = cita.estado;
    this.politica.validarVentanaCheckIn(cita.fechaHoraInicio, ahora);
    cita.realizarCheckIn();

    await this.citaRepo.ejecutarEnTransaccion(async (tx) => {
      await tx.actualizarCita(cita);
    });

    await this.eventBus.publicar<CitaEventoPayload>({
      nombre: CITA_CHECKIN_EVENT,
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
