import Redis from 'ioredis';
import { ConsultarDisponibilidadUseCase } from '../../../src/modulos/agenda/aplicacion/consultar-disponibilidad.use-case';
import {
  DisponibilidadPort,
  SlotDisponibleResumen,
} from '../../../src/modulos/agenda/dominio/disponibilidad.port';
import { TurnoDia } from '../../../src/modulos/agenda/dominio/estado-slot.vo';
import { CacheInvalidationListener } from '../../../src/modulos/agenda/infraestructura/cache-invalidation.listener';
import { CachedDisponibilidadDecorator } from '../../../src/modulos/agenda/infraestructura/cached-disponibilidad.decorator';
import { InMemoryEventBus } from '../../../src/shared/eventos/domain-event';

describe('CachedDisponibilidadDecorator y ConsultarDisponibilidadUseCase', () => {
  const sampleSlot: SlotDisponibleResumen = {
    slotId: 'slot-1',
    agendaId: 'ag-1',
    medicoId: 'med-1',
    especialidadId: 'esp-1',
    consultorioId: 'cons-1',
    sedeId: 'HUAMANGA-CENTRAL',
    fechaHoraInicio: '2099-12-15T08:00:00.000Z',
    fechaHoraFin: '2099-12-15T08:20:00.000Z',
    turno: TurnoDia.MANANA,
  };

  it('debe servir desde Redis en Cache Hit sin consultar PostgreSQL', async () => {
    const inner: DisponibilidadPort = {
      buscarDisponibles: jest.fn().mockResolvedValue([sampleSlot]),
    };
    const redis = {
      get: jest.fn().mockResolvedValue(JSON.stringify([sampleSlot])),
      set: jest.fn(),
    };

    const decorator = new CachedDisponibilidadDecorator(inner, redis, 60);
    const res = await decorator.buscarDisponibles({
      especialidadId: 'esp-1',
      fecha: '2099-12-15',
    });

    expect(res).toEqual([sampleSlot]);
    expect(inner.buscarDisponibles).not.toHaveBeenCalled();
  });

  it('debe consultar PostgreSQL en Cache Miss y poblar Redis con TTL', async () => {
    const inner: DisponibilidadPort = {
      buscarDisponibles: jest.fn().mockResolvedValue([sampleSlot]),
    };
    const redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };

    const decorator = new CachedDisponibilidadDecorator(inner, redis, 60);
    const res = await decorator.buscarDisponibles({
      especialidadId: 'esp-1',
      fecha: '2099-12-15',
    });

    expect(res).toEqual([sampleSlot]);
    expect(inner.buscarDisponibles).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledWith(
      'disp:esp-1:2099-12-15:all:all:all',
      JSON.stringify([sampleSlot]),
      'EX',
      60,
    );
  });

  it('debe degradar a PostgreSQL (fail-open) cuando Redis falla', async () => {
    const inner: DisponibilidadPort = {
      buscarDisponibles: jest.fn().mockResolvedValue([sampleSlot]),
    };
    const redis = {
      get: jest.fn().mockRejectedValue(new Error('Redis timeout')),
      set: jest.fn().mockRejectedValue(new Error('Redis timeout')),
    };

    const decorator = new CachedDisponibilidadDecorator(inner, redis, 60);
    const res = await decorator.buscarDisponibles({
      especialidadId: 'esp-1',
      fecha: '2099-12-15',
    });

    expect(res).toEqual([sampleSlot]);
    expect(inner.buscarDisponibles).toHaveBeenCalledTimes(1);
  });

  it('debe retornar lista vacía para fechas pasadas en ConsultarDisponibilidadUseCase', async () => {
    const port: DisponibilidadPort = {
      buscarDisponibles: jest.fn().mockResolvedValue([sampleSlot]),
    };
    const useCase = new ConsultarDisponibilidadUseCase(port);

    const pasado = await useCase.ejecutar({ especialidadId: 'esp-1', fecha: '2020-01-01' });
    expect(pasado).toEqual([]);
    expect(port.buscarDisponibles).not.toHaveBeenCalled();

    const futuro = await useCase.ejecutar({ especialidadId: 'esp-1', fecha: '2099-12-15' });
    expect(futuro).toEqual([sampleSlot]);
  });

  it('debe invalidar llaves en Redis al recibir eventos de dominio', async () => {
    const eventBus = new InMemoryEventBus();
    const redisMock = {
      scan: jest.fn().mockResolvedValue(['0', ['disp:esp-1:2099-12-15:all:all:all']]),
      del: jest.fn().mockResolvedValue(1),
    } as unknown as Redis;

    const listener = new CacheInvalidationListener(eventBus, redisMock);
    listener.onModuleInit();

    await eventBus.publicar({
      nombre: 'cita.reservada',
      ocurridoEn: new Date(),
      payload: { especialidadId: 'esp-1', fecha: '2099-12-15' },
    });

    expect(redisMock.scan).toHaveBeenCalled();
    expect(redisMock.del).toHaveBeenCalledWith('disp:esp-1:2099-12-15:all:all:all');
  });
});
