import { Inject, Injectable } from '@nestjs/common';
import { EVENT_BUS, EventBusPort } from '../../../shared/eventos/domain-event';
import { AGENDA_REPOSITORY_PORT, AgendaRepositoryPort } from '../dominio/agenda-repository.port';
import { AGENDA_BLOQUEADA_EVENT, AgendaBloqueadaPayload } from '../dominio/estado-slot.vo';
import { BloquearSlotsDto } from './dtos/agenda.dtos';

@Injectable()
export class BloquearSlotsUseCase {
  constructor(
    @Inject(AGENDA_REPOSITORY_PORT)
    private readonly agendaRepo: AgendaRepositoryPort,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBusPort,
  ) {}

  async ejecutar(dto: BloquearSlotsDto): Promise<{ slotsAfectados: number }> {
    const { especialidadId, slotsAfectados } = await this.agendaRepo.bloquearSlotsPorCriterio({
      medicoId: dto.medicoId,
      fecha: dto.fecha,
      horaDesde: dto.horaDesde,
      horaHasta: dto.horaHasta,
      motivo: dto.motivo,
    });

    if (slotsAfectados > 0 && especialidadId) {
      await this.eventBus.publicar<AgendaBloqueadaPayload>({
        nombre: AGENDA_BLOQUEADA_EVENT,
        ocurridoEn: new Date(),
        payload: {
          especialidadId,
          medicoId: dto.medicoId,
          fecha: dto.fecha,
          motivo: dto.motivo,
          slotsAfectados,
        },
      });
    }

    return { slotsAfectados };
  }
}
