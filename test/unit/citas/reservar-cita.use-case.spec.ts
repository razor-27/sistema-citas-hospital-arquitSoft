import { ReservarCitaUseCase } from '../../../src/modulos/citas/aplicacion/reservar-cita.use-case';
import { CITA_RESERVADA_EVENT } from '../../../src/modulos/citas/dominio/estado-cita.vo';
import { PoliticaReservaService } from '../../../src/modulos/citas/dominio/politica-reserva.service';
import { RedisDistributedLockAdapter } from '../../../src/modulos/citas/infraestructura/redis-distributed-lock';
import {
  ConflictoConcurrenciaError,
  RecursoNoEncontradoError,
  ReglaNegocioError,
} from '../../../src/shared/errores';
import { InMemoryEventBus } from '../../../src/shared/eventos/domain-event';
import { InMemoryCitaRepository, InMemoryDistributedLock } from './in-memory-citas.double';

describe('ReservarCitaUseCase y Concurrencia (EQ-04)', () => {
  let repo: InMemoryCitaRepository;
  let lock: InMemoryDistributedLock;
  let eventBus: InMemoryEventBus;
  let useCase: ReservarCitaUseCase;

  beforeEach(() => {
    repo = new InMemoryCitaRepository();
    lock = new InMemoryDistributedLock();
    eventBus = new InMemoryEventBus();
    useCase = new ReservarCitaUseCase(repo, lock, eventBus, new PoliticaReservaService());

    repo.seedSlot({
      id: 'slot-4580',
      medicoId: 'med-1',
      especialidadId: 'esp-1',
      fechaHoraInicio: new Date('2099-12-20T09:00:00.000Z'),
      estado: 'DISPONIBLE',
      agendaPublicada: true,
    });
  });

  it('debe reservar un cupo libre, marcar el slot RESERVADO y emitir CitaReservadaEvent', async () => {
    const eventos: unknown[] = [];
    eventBus.suscribir(CITA_RESERVADA_EVENT, (e) => {
      eventos.push(e.payload);
    });

    const res = await useCase.ejecutar({ slotId: 'slot-4580', pacienteId: 'pac-1' }, 'pac-1');

    expect(res.codigoReserva).toMatch(/^CIT-/);
    expect(repo.slots.get('slot-4580')?.info.estado).toBe('RESERVADO');
    expect(eventos).toHaveLength(1);
  });

  it('debe garantizar 0% doble reserva ante 50 peticiones concurrentes al mismo slotId (EQ-04)', async () => {
    const peticiones = Array.from({ length: 50 }, (_, idx) =>
      useCase.ejecutar({ slotId: 'slot-4580', pacienteId: `pac-${idx}` }, `pac-${idx}`),
    );

    const resultados = await Promise.allSettled(peticiones);
    const exitosas = resultados.filter((r) => r.status === 'fulfilled');
    const rechazadas = resultados.filter((r) => r.status === 'rejected');

    expect(exitosas).toHaveLength(1);
    expect(rechazadas).toHaveLength(49);
    for (const r of rechazadas) {
      if (r.status === 'rejected') {
        expect(r.reason).toBeInstanceOf(ConflictoConcurrenciaError);
      }
    }
    expect(repo.citas.size).toBe(1);
  });

  it('debe rechazar si el slot no existe o la agenda no está publicada y liberar el lock', async () => {
    await expect(
      useCase.ejecutar({ slotId: 'slot-inexistente', pacienteId: 'pac-1' }, 'pac-1'),
    ).rejects.toThrow(RecursoNoEncontradoError);

    repo.seedSlot({
      id: 'slot-borrador',
      medicoId: 'med-1',
      especialidadId: 'esp-1',
      fechaHoraInicio: new Date('2099-12-21T09:00:00.000Z'),
      estado: 'DISPONIBLE',
      agendaPublicada: false,
    });

    await expect(
      useCase.ejecutar({ slotId: 'slot-borrador', pacienteId: 'pac-1' }, 'pac-1'),
    ).rejects.toThrow(ReglaNegocioError);

    // El lock debe haber sido liberado en finally
    const lockReintento = await lock.adquirirLock('lock:slot:slot-borrador');
    expect(lockReintento).not.toBeNull();
  });

  it('debe adquirir y liberar locks en RedisDistributedLockAdapter con Lua', async () => {
    const redisMock = {
      set: jest.fn().mockResolvedValueOnce('OK').mockResolvedValueOnce(null),
      eval: jest.fn().mockResolvedValue(1),
    };
    const adapter = new RedisDistributedLockAdapter(redisMock);

    const token = await adapter.adquirirLock('lock:slot:1', 10000);
    expect(token).toEqual(expect.any(String));
    expect(await adapter.adquirirLock('lock:slot:1', 10000)).toBeNull();

    await adapter.liberarLock('lock:slot:1', token!);
    expect(redisMock.eval).toHaveBeenCalled();
  });
});
