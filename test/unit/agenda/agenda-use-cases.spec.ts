import { BloquearSlotsUseCase } from '../../../src/modulos/agenda/aplicacion/bloquear-slots.use-case';
import { CrearOfertaMedicaUseCase } from '../../../src/modulos/agenda/aplicacion/crear-oferta-medica.use-case';
import { PublicarAgendaUseCase } from '../../../src/modulos/agenda/aplicacion/publicar-agenda.use-case';
import { AgendaMedica } from '../../../src/modulos/agenda/dominio/agenda-medica.entity';
import {
  AgendaRepositoryPort,
  BloquearSlotsCriterio,
} from '../../../src/modulos/agenda/dominio/agenda-repository.port';
import { AGENDA_BLOQUEADA_EVENT } from '../../../src/modulos/agenda/dominio/estado-slot.vo';
import { ConflictoConcurrenciaError, RecursoNoEncontradoError } from '../../../src/shared/errores';
import { InMemoryEventBus } from '../../../src/shared/eventos/domain-event';

class InMemoryAgendaRepo implements AgendaRepositoryPort {
  readonly store = new Map<string, AgendaMedica>();
  solapamiento = false;

  async guardar(agenda: AgendaMedica): Promise<void> {
    this.store.set(agenda.id, agenda);
  }

  async buscarPorId(agendaId: string): Promise<AgendaMedica | null> {
    return this.store.get(agendaId) ?? null;
  }

  async actualizarPublicacion(agendaId: string, publicada: boolean): Promise<void> {
    const agenda = this.store.get(agendaId);
    if (agenda && publicada && !agenda.publicada) {
      agenda.publicar();
    }
  }

  async existeSolapamiento(): Promise<boolean> {
    return this.solapamiento;
  }

  async bloquearSlotsPorCriterio(criterio: BloquearSlotsCriterio) {
    let slotsAfectados = 0;
    let especialidadId = '';
    for (const agenda of this.store.values()) {
      if (agenda.medicoId === criterio.medicoId && agenda.fecha === criterio.fecha) {
        especialidadId = agenda.especialidadId;
        for (const slot of agenda.slots) {
          if (slot.estaDisponible()) {
            slot.bloquear(criterio.motivo);
            slotsAfectados += 1;
          }
        }
      }
    }
    return { especialidadId, slotsAfectados };
  }
}

describe('Casos de Uso de Agenda (Oferta, Publicación y Bloqueo)', () => {
  let repo: InMemoryAgendaRepo;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    repo = new InMemoryAgendaRepo();
    eventBus = new InMemoryEventBus();
  });

  const dto = {
    medicoId: 'med-1',
    especialidadId: 'esp-1',
    consultorioId: 'cons-1',
    fecha: '2026-12-15',
    horaInicio: '08:00',
    horaFin: '09:00',
    duracionMin: 15,
    fechaApertura: '2026-12-01T07:00:00.000Z',
  };

  it('debe crear una oferta médica y generar sus slots', async () => {
    const useCase = new CrearOfertaMedicaUseCase(repo);
    const res = await useCase.ejecutar(dto);

    expect(res.totalSlotsGenerados).toBe(4);
    expect(res.publicada).toBe(false);
    expect(repo.store.size).toBe(1);
  });

  it('debe lanzar ConflictoConcurrenciaError si hay solapamiento horario', async () => {
    repo.solapamiento = true;
    const useCase = new CrearOfertaMedicaUseCase(repo);

    await expect(useCase.ejecutar(dto)).rejects.toThrow(ConflictoConcurrenciaError);
  });

  it('debe publicar una agenda existente y lanzar 404 si no existe', async () => {
    const crear = new CrearOfertaMedicaUseCase(repo);
    const { agendaId } = await crear.ejecutar(dto);

    const publicar = new PublicarAgendaUseCase(repo);
    const res = await publicar.ejecutar(agendaId);
    expect(res.publicada).toBe(true);

    await expect(publicar.ejecutar('no-existe')).rejects.toThrow(RecursoNoEncontradoError);
  });

  it('debe bloquear slots disponibles y publicar AgendaBloqueadaEvent', async () => {
    const crear = new CrearOfertaMedicaUseCase(repo);
    await crear.ejecutar(dto);

    const eventos: unknown[] = [];
    eventBus.suscribir(AGENDA_BLOQUEADA_EVENT, (e) => {
      eventos.push(e.payload);
    });

    const bloquear = new BloquearSlotsUseCase(repo, eventBus);
    const res = await bloquear.ejecutar({
      medicoId: 'med-1',
      fecha: '2026-12-15',
      motivo: 'Capacitación MINSA',
    });

    expect(res.slotsAfectados).toBe(4);
    expect(eventos).toHaveLength(1);
  });
});
