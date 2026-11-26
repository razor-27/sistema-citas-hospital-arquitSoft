import {
  AuditoriaListener,
  AUDITORIA_REPOSITORY,
} from '../../src/modulos/auditoria/infraestructura/auditoria.listener';
import {
  AuditoriaRepositoryPort,
  EventoAuditoria,
} from '../../src/modulos/auditoria/dominio/auditoria-repository.port';
import { InMemoryEventBus } from '../../src/shared/eventos/domain-event';
import { Test } from '@nestjs/testing';

/** Double en memoria para AuditoriaRepository */
class InMemoryAuditoriaRepo implements AuditoriaRepositoryPort {
  readonly eventos: EventoAuditoria[] = [];

  async registrar(evento: EventoAuditoria): Promise<void> {
    this.eventos.push(evento);
  }

  async buscarPorCitaId(citaId: string): Promise<EventoAuditoria[]> {
    return this.eventos.filter((e) => e.citaId === citaId);
  }

  async buscarPorCodigoReserva(codigo: string): Promise<EventoAuditoria[]> {
    return this.eventos.filter((e) => e.codigoReserva === codigo);
  }

  async buscarPorDni(dni: string): Promise<EventoAuditoria[]> {
    return this.eventos.filter((e) => e.usuarioDni === dni);
  }

  async reporteOcupacion(): Promise<{ operacion: string; total: number }[]> {
    const conteo: Record<string, number> = {};
    for (const e of this.eventos) {
      conteo[e.operacion] = (conteo[e.operacion] ?? 0) + 1;
    }
    return Object.entries(conteo).map(([operacion, total]) => ({ operacion, total }));
  }
}

describe('AuditoriaListener', () => {
  let listener: AuditoriaListener;
  let eventBus: InMemoryEventBus;
  let repo: InMemoryAuditoriaRepo;

  beforeEach(async () => {
    eventBus = new InMemoryEventBus();
    repo = new InMemoryAuditoriaRepo();

    const module = await Test.createTestingModule({
      providers: [
        AuditoriaListener,
        { provide: 'EVENT_BUS', useValue: eventBus },
        { provide: AUDITORIA_REPOSITORY, useValue: repo },
      ],
    }).compile();

    listener = module.get(AuditoriaListener);
    listener.onModuleInit();
  });

  it('debe registrar evento cuando se publica cita.reservada', async () => {
    await eventBus.publish({
      tipo: 'cita.reservada',
      payload: {
        citaId: 'cita-1',
        codigoReserva: 'CIT-ABC123',
        usuarioId: 'usr-1',
        usuarioDni: '12345678',
        estadoNuevo: 'CONFIRMADA',
      },
      ocurridoEn: new Date().toISOString(),
    });

    // Permitir que el handler async se ejecute
    await new Promise((r) => setImmediate(r));

    expect(repo.eventos).toHaveLength(1);
    expect(repo.eventos[0].operacion).toBe('cita.reservada');
    expect(repo.eventos[0].citaId).toBe('cita-1');
    expect(repo.eventos[0].codigoReserva).toBe('CIT-ABC123');
  });

  it('debe registrar múltiples eventos de tipos distintos', async () => {
    for (const tipo of ['cita.reservada', 'cita.cancelada', 'cita.checkin'] as const) {
      await eventBus.publish({
        tipo,
        payload: { citaId: 'cita-1', codigoReserva: 'CIT-XY9999' },
        ocurridoEn: new Date().toISOString(),
      });
    }

    await new Promise((r) => setImmediate(r));

    expect(repo.eventos).toHaveLength(3);
    const operaciones = repo.eventos.map((e) => e.operacion);
    expect(operaciones).toContain('cita.reservada');
    expect(operaciones).toContain('cita.cancelada');
    expect(operaciones).toContain('cita.checkin');
  });

  it('no debe interrumpir el flujo si el repositorio falla (fail-safe)', async () => {
    jest.spyOn(repo, 'registrar').mockRejectedValueOnce(new Error('DB no disponible'));

    await expect(
      eventBus.publish({
        tipo: 'cita.reservada',
        payload: { citaId: 'cita-err' },
        ocurridoEn: new Date().toISOString(),
      }),
    ).resolves.not.toThrow();
  });

  it('debe poder consultar por código de reserva', async () => {
    await eventBus.publish({
      tipo: 'cita.reservada',
      payload: { citaId: 'c1', codigoReserva: 'CIT-TEST01' },
      ocurridoEn: new Date().toISOString(),
    });
    await new Promise((r) => setImmediate(r));

    const encontrados = await repo.buscarPorCodigoReserva('CIT-TEST01');
    expect(encontrados).toHaveLength(1);
  });
});
