import { Inject, Injectable } from '@nestjs/common';
import { RecursoNoEncontradoError } from '../../../shared/errores';
import { EVENT_BUS, EventBusPort } from '../../../shared/eventos/domain-event';
import { Cita } from '../dominio/cita.entity';
import { CITAS_REPOSITORY_PORT, CitaRepositoryPort } from '../dominio/citas.ports';
import { CITA_RESERVADA_EVENT, CitaEventoPayload } from '../dominio/estado-cita.vo';
import { PoliticaReservaService } from '../dominio/politica-reserva.service';
import { CitaResponseDto, RegistrarSobrecupoDto, toCitaResponse } from './dtos/citas.dtos';

@Injectable()
export class RegistrarSobrecupoUseCase {
  constructor(
    @Inject(CITAS_REPOSITORY_PORT) private readonly citaRepo: CitaRepositoryPort,
    @Inject(EVENT_BUS) private readonly eventBus: EventBusPort,
    private readonly politica: PoliticaReservaService,
  ) {}

  async ejecutar(
    dto: RegistrarSobrecupoDto,
    admisionUserId: string,
    ip?: string,
  ): Promise<CitaResponseDto> {
    const slot = await this.citaRepo.obtenerSlotInfo(dto.slotId);
    if (!slot) {
      throw new RecursoNoEncontradoError(`Cupo ${dto.slotId} no encontrado.`);
    }

    const fechaStr = slot.fechaHoraInicio.toISOString().slice(0, 10);
    const [sobrecuposActuales, maxSobrecupos] = await Promise.all([
      this.citaRepo.contarSobrecuposDia(slot.especialidadId, fechaStr),
      this.citaRepo.obtenerMaxSobrecuposEspecialidad(slot.especialidadId),
    ]);

    this.politica.validarLimiteSobrecupo(sobrecuposActuales, maxSobrecupos);

    const cita = Cita.crear({
      pacienteId: dto.pacienteId,
      slotId: slot.id,
      medicoId: slot.medicoId,
      especialidadId: slot.especialidadId,
      fechaHoraInicio: slot.fechaHoraInicio,
      creadoPor: admisionUserId,
      esSobrecupo: true,
      motivoSobrecupo: dto.motivoSobrecupo,
    });

    await this.citaRepo.ejecutarEnTransaccion(async (tx) => {
      await tx.guardarCita(cita);
    });

    await this.eventBus.publicar<CitaEventoPayload>({
      nombre: CITA_RESERVADA_EVENT,
      ocurridoEn: new Date(),
      payload: {
        citaId: cita.id,
        codigoReserva: cita.codigoReserva.valor,
        pacienteId: cita.pacienteId,
        slotId: cita.slotId,
        medicoId: cita.medicoId,
        especialidadId: cita.especialidadId,
        fecha: fechaStr,
        estadoNuevo: cita.estado,
        actorId: admisionUserId,
        ip,
      },
    });

    return toCitaResponse(cita);
  }
}
