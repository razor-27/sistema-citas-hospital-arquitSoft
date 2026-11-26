import { Test } from '@nestjs/testing';
import {
  NotificacionesConsumer,
  NOTIFICACION_WHATSAPP,
  NOTIFICACION_SMS,
} from '../../src/modulos/notificaciones/infraestructura/notificaciones.consumer';
import { NotificacionPort } from '../../src/modulos/notificaciones/dominio/notificacion.port';
import { InMemoryEventBus } from '../../src/shared/eventos/domain-event';

/** Pasarela WhatsApp que falla X veces antes de tener éxito */
function makeFlakeyWhatsApp(failCount: number): NotificacionPort & { calls: number } {
  let calls = 0;
  return {
    calls: 0,
    soportaCanal: () => true,
    async enviar() {
      calls++;
      (this as { calls: number }).calls = calls;
      if (calls <= failCount) {
        return { exitoso: false, error: `Error simulado intento ${calls}` };
      }
      return { exitoso: true };
    },
  };
}

describe('NotificacionesConsumer — Reintentos y DLQ', () => {
  let consumer: NotificacionesConsumer;
  let eventBus: InMemoryEventBus;

  it('envía notificación correctamente en el primer intento', async () => {
    eventBus = new InMemoryEventBus();
    const whatsapp = makeFlakeyWhatsApp(0); // 0 fallos
    const sms: NotificacionPort = {
      soportaCanal: () => true,
      enviar: jest.fn().mockResolvedValue({ exitoso: true }),
    };

    const module = await Test.createTestingModule({
      providers: [
        NotificacionesConsumer,
        { provide: 'EVENT_BUS', useValue: eventBus },
        { provide: NOTIFICACION_WHATSAPP, useValue: whatsapp },
        { provide: NOTIFICACION_SMS, useValue: sms },
      ],
    }).compile();

    consumer = module.get(NotificacionesConsumer);
    consumer.onModuleInit();

    await eventBus.publish({
      tipo: 'cita.reservada',
      payload: { citaId: 'c1', codigoReserva: 'CIT-OK0001', pacienteTelefono: '+51999000111' },
      ocurridoEn: new Date().toISOString(),
    });

    await new Promise((r) => setImmediate(r));
    expect(whatsapp.calls).toBe(1);
    expect(consumer.getDlq()).toHaveLength(0);
  }, 10000);

  it('mueve evento a DLQ tras agotar reintentos (5 fallos consecutivos)', async () => {
    eventBus = new InMemoryEventBus();
    const whatsapp = makeFlakeyWhatsApp(10); // Siempre falla
    const sms: NotificacionPort = {
      soportaCanal: () => true,
      enviar: jest.fn().mockResolvedValue({ exitoso: true }),
    };

    const module = await Test.createTestingModule({
      providers: [
        NotificacionesConsumer,
        { provide: 'EVENT_BUS', useValue: eventBus },
        { provide: NOTIFICACION_WHATSAPP, useValue: whatsapp },
        { provide: NOTIFICACION_SMS, useValue: sms },
      ],
    }).compile();

    consumer = module.get(NotificacionesConsumer);
    // Override delays to 0ms for testing
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: () => void) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    });
    consumer.onModuleInit();

    await eventBus.publish({
      tipo: 'cita.reservada',
      payload: { citaId: 'c2', codigoReserva: 'CIT-FAIL01', pacienteTelefono: '+51999000222' },
      ocurridoEn: new Date().toISOString(),
    });

    // Esperar procesamiento async
    await new Promise((r) => setTimeout(r, 100));

    expect(consumer.getDlq()).toHaveLength(1);
    expect(consumer.getDlq()[0].evento).toBe('cita.reservada');
  }, 15000);

  it('no envía nada si el payload no tiene teléfono', async () => {
    eventBus = new InMemoryEventBus();
    const whatsappSpy = jest.fn().mockResolvedValue({ exitoso: true });
    const whatsapp: NotificacionPort = { soportaCanal: () => true, enviar: whatsappSpy };
    const sms: NotificacionPort = {
      soportaCanal: () => true,
      enviar: jest.fn().mockResolvedValue({ exitoso: true }),
    };

    const module = await Test.createTestingModule({
      providers: [
        NotificacionesConsumer,
        { provide: 'EVENT_BUS', useValue: eventBus },
        { provide: NOTIFICACION_WHATSAPP, useValue: whatsapp },
        { provide: NOTIFICACION_SMS, useValue: sms },
      ],
    }).compile();

    consumer = module.get(NotificacionesConsumer);
    consumer.onModuleInit();

    await eventBus.publish({
      tipo: 'cita.reservada',
      payload: { citaId: 'c3', codigoReserva: 'CIT-NOTEL' }, // sin teléfono
      ocurridoEn: new Date().toISOString(),
    });

    await new Promise((r) => setImmediate(r));
    expect(whatsappSpy).not.toHaveBeenCalled();
  });
});
