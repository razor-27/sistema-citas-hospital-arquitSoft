import { Inject, Injectable } from '@nestjs/common';
import { ConflictoConcurrenciaError } from '../../../shared/errores';
import { AgendaMedica } from '../dominio/agenda-medica.entity';
import { AGENDA_REPOSITORY_PORT, AgendaRepositoryPort } from '../dominio/agenda-repository.port';
import { CrearOfertaMedicaDto } from './dtos/agenda.dtos';

export interface OfertaMedicaCreadaResponse {
  readonly agendaId: string;
  readonly totalSlotsGenerados: number;
  readonly publicada: boolean;
}

@Injectable()
export class CrearOfertaMedicaUseCase {
  constructor(
    @Inject(AGENDA_REPOSITORY_PORT)
    private readonly agendaRepo: AgendaRepositoryPort,
  ) {}

  async ejecutar(dto: CrearOfertaMedicaDto): Promise<OfertaMedicaCreadaResponse> {
    const haySolapamiento = await this.agendaRepo.existeSolapamiento(
      dto.medicoId,
      dto.fecha,
      dto.horaInicio,
      dto.horaFin,
    );

    if (haySolapamiento) {
      throw new ConflictoConcurrenciaError(
        `El médico ${dto.medicoId} ya tiene turnos programados que se solapan en ${dto.fecha}.`,
      );
    }

    const agenda = AgendaMedica.crear({
      medicoId: dto.medicoId,
      especialidadId: dto.especialidadId,
      consultorioId: dto.consultorioId,
      sedeId: dto.sedeId,
      fecha: dto.fecha,
      horaInicio: dto.horaInicio,
      horaFin: dto.horaFin,
      duracionMin: dto.duracionMin,
      fechaApertura: new Date(dto.fechaApertura),
    });

    await this.agendaRepo.guardar(agenda);

    return {
      agendaId: agenda.id,
      totalSlotsGenerados: agenda.slots.length,
      publicada: agenda.publicada,
    };
  }
}
