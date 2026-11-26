import { Inject, Injectable } from '@nestjs/common';
import { RecursoNoEncontradoError } from '../../../shared/errores';
import { AGENDA_REPOSITORY_PORT, AgendaRepositoryPort } from '../dominio/agenda-repository.port';

@Injectable()
export class PublicarAgendaUseCase {
  constructor(
    @Inject(AGENDA_REPOSITORY_PORT)
    private readonly agendaRepo: AgendaRepositoryPort,
  ) {}

  async ejecutar(agendaId: string): Promise<{ agendaId: string; publicada: boolean }> {
    const agenda = await this.agendaRepo.buscarPorId(agendaId);
    if (!agenda) {
      throw new RecursoNoEncontradoError(`Agenda ${agendaId} no encontrada.`);
    }

    agenda.publicar();
    await this.agendaRepo.actualizarPublicacion(agenda.id, agenda.publicada);

    return { agendaId: agenda.id, publicada: agenda.publicada };
  }
}
