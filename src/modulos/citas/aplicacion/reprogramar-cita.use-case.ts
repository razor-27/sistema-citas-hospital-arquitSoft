import { Inject, Injectable } from '@nestjs/common';
import { ConflictoConcurrenciaError, RecursoNoEncontradoError } from '../../../shared/errores';
import { EVENT_BUS, EventBusPort } from '../../../shared/eventos/domain-event';
import {
  CITAS_REPOSITORY_PORT,
  CitaRepositoryPort,
  DISTRIBUTED_LOCK_PORT,
  DistributedLockPort,
} from '../dominio/citas.ports';
import { CITA_REPROGRAMADA_EVENT, CitaEventoPayload } from '../dominio/estado-cita.vo';
import { PoliticaReservaService } from '../dominio/politica-reserva.service';
import { CitaResponseDto, toCitaResponse } from './dtos/citas.dtos';

@Injectable()
export class ReprogramarCitaUseCase {
  constructor(
    @Inject(CITAS_REPOSITORY_PORT) private readonly citaRepo: CitaRepositoryPort,
    @Inject(DISTRIBUTED_LOCK_PORT) private readonly lockPort: DistributedLockPort,
    @Inject(EVENT_BUS) private readonly eventBus: EventBusPort,
    private readonly politica: PoliticaReservaService,
  ) {}

  async ejecutar(
    citaId: string,
    nuevoSlotId: string,
    actorId: string,
    esAdmision = false,
    ip?: string,
  ): Promise<CitaResponseDto> {
    const cita = await this.citaRepo.buscarPorId(citaId);
    if (!cita) {
      throw new RecursoNoEncontradoError(`Cita ${citaId} no encontrada.`);
    }

    this.politica.validarAnticipacionCambio(cita.fechaHoraInicio, new Date(), esAdmision);

    const lockKey = `lock:slot:${nuevoSlotId}`;
    const lockToken = await this.lockPort.adquirirLock(lockKey, 10000);
    if (!lockToken) {
      throw new ConflictoConcurrenciaError('El nuevo cupo está siendo reservado por otro usuario.');
    }

    const slotAnteriorId = cita.slotId;
    const fechaAnterior = cita.fechaHoraInicio.toISOString().slice(0, 10);

    try {
      await this.citaRepo.ejecutarEnTransaccion(async (tx) => {
        const nuevoSlot = await tx.obtenerSlotParaReservaConBloqueo(nuevoSlotId);
        if (!nuevoSlot) {
          throw new RecursoNoEncontradoError(`Cupo ${nuevoSlotId} no encontrado.`);
        }
        if (nuevoSlot.estado !== 'DISPONIBLE' || !nuevoSlot.agendaPublicada) {
          throw new ConflictoConcurrenciaError(`El cupo ${nuevoSlotId} no está disponible.`);
        }

        cita.reprogramar(nuevoSlot.id, nuevoSlot.fechaHoraInicio);

        await tx.marcarSlotReservado(nuevoSlot.id);
        if (!cita.esSobrecupo) {
          await tx.liberarSlot(slotAnteriorId);
        }
        await tx.actualizarCita(cita);
      });

      // Invalidar caché tanto de fecha anterior como de fecha nueva
      await this.eventBus.publicar<CitaEventoPayload>({
        nombre: CITA_REPROGRAMADA_EVENT,
        ocurridoEn: new Date(),
        payload: {
          citaId: cita.id,
          codigoReserva: cita.codigoReserva.valor,
          pacienteId: cita.pacienteId,
          slotId: cita.slotId,
          medicoId: cita.medicoId,
          especialidadId: cita.especialidadId,
          fecha: fechaAnterior,
          estadoAnterior: cita.estado,
          estadoNuevo: cita.estado,
          actorId,
          ip,
        },
      });

      const fechaNueva = cita.fechaHoraInicio.toISOString().slice(0, 10);
      if (fechaNueva !== fechaAnterior) {
        await this.eventBus.publicar<CitaEventoPayload>({
          nombre: CITA_REPROGRAMADA_EVENT,
          ocurridoEn: new Date(),
          payload: {
            citaId: cita.id,
            codigoReserva: cita.codigoReserva.valor,
            pacienteId: cita.pacienteId,
            slotId: cita.slotId,
            medicoId: cita.medicoId,
            especialidadId: cita.especialidadId,
            fecha: fechaNueva,
            estadoAnterior: cita.estado,
            estadoNuevo: cita.estado,
            actorId,
            ip,
          },
        });
      }

      return toCitaResponse(cita);
    } finally {
      await this.lockPort.liberarLock(lockKey, lockToken);
    }
  }
}
