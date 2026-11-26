import { Inject, Injectable } from '@nestjs/common';
import {
  ConflictoConcurrenciaError,
  RecursoNoEncontradoError,
  ReglaNegocioError,
} from '../../../shared/errores';
import { EVENT_BUS, EventBusPort } from '../../../shared/eventos/domain-event';
import { Cita } from '../dominio/cita.entity';
import {
  CITAS_REPOSITORY_PORT,
  CitaRepositoryPort,
  DISTRIBUTED_LOCK_PORT,
  DistributedLockPort,
} from '../dominio/citas.ports';
import { CITA_RESERVADA_EVENT, CitaEventoPayload } from '../dominio/estado-cita.vo';
import { PoliticaReservaService } from '../dominio/politica-reserva.service';
import { CitaResponseDto, ReservarCitaDto, toCitaResponse } from './dtos/citas.dtos';

const DEFAULT_LOCK_TTL_MS = 10000;

@Injectable()
export class ReservarCitaUseCase {
  constructor(
    @Inject(CITAS_REPOSITORY_PORT) private readonly citaRepo: CitaRepositoryPort,
    @Inject(DISTRIBUTED_LOCK_PORT) private readonly lockPort: DistributedLockPort,
    @Inject(EVENT_BUS) private readonly eventBus: EventBusPort,
    private readonly politica: PoliticaReservaService,
  ) {}

  async ejecutar(dto: ReservarCitaDto, actorId: string, ip?: string): Promise<CitaResponseDto> {
    const lockKey = `lock:slot:${dto.slotId}`;
    const lockToken = await this.lockPort.adquirirLock(lockKey, DEFAULT_LOCK_TTL_MS);

    if (!lockToken) {
      throw new ConflictoConcurrenciaError(
        'El cupo está siendo reservado por otro usuario en este momento.',
      );
    }

    try {
      const cita = await this.citaRepo.ejecutarEnTransaccion(async (tx) => {
        const slot = await tx.obtenerSlotParaReservaConBloqueo(dto.slotId);
        if (!slot) {
          throw new RecursoNoEncontradoError(`Cupo ${dto.slotId} no encontrado.`);
        }
        if (!slot.agendaPublicada) {
          throw new ReglaNegocioError('La agenda médica aún no está publicada para reservas.');
        }
        if (slot.estado !== 'DISPONIBLE') {
          throw new ConflictoConcurrenciaError(
            `El cupo ${dto.slotId} ya no se encuentra disponible.`,
          );
        }

        const fechaStr = slot.fechaHoraInicio.toISOString().slice(0, 10);
        const yaTieneCita = await this.citaRepo.existeCitaActivaPaciente(
          dto.pacienteId,
          slot.especialidadId,
          fechaStr,
        );
        this.politica.validarSinDuplicidadPaciente(yaTieneCita);

        const nuevaCita = Cita.crear({
          pacienteId: dto.pacienteId,
          slotId: slot.id,
          medicoId: slot.medicoId,
          especialidadId: slot.especialidadId,
          fechaHoraInicio: slot.fechaHoraInicio,
          creadoPor: actorId,
        });

        await tx.marcarSlotReservado(slot.id);
        await tx.guardarCita(nuevaCita);
        return nuevaCita;
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
          fecha: cita.fechaHoraInicio.toISOString().slice(0, 10),
          estadoNuevo: cita.estado,
          actorId,
          ip,
        },
      });

      return toCitaResponse(cita);
    } finally {
      await this.lockPort.liberarLock(lockKey, lockToken);
    }
  }
}
