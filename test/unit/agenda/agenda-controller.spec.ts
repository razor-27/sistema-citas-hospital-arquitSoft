import { BloquearSlotsUseCase } from '../../../src/modulos/agenda/aplicacion/bloquear-slots.use-case';
import { ConsultarDisponibilidadUseCase } from '../../../src/modulos/agenda/aplicacion/consultar-disponibilidad.use-case';
import { CrearOfertaMedicaUseCase } from '../../../src/modulos/agenda/aplicacion/crear-oferta-medica.use-case';
import { PublicarAgendaUseCase } from '../../../src/modulos/agenda/aplicacion/publicar-agenda.use-case';
import { AgendaController } from '../../../src/modulos/agenda/presentacion/agenda.controller';

describe('AgendaController', () => {
  it('debe delegar cada endpoint al caso de uso correspondiente', async () => {
    const consultar = {
      ejecutar: jest.fn().mockResolvedValue([]),
    } as unknown as ConsultarDisponibilidadUseCase;
    const crear = {
      ejecutar: jest
        .fn()
        .mockResolvedValue({ agendaId: 'ag-1', totalSlotsGenerados: 4, publicada: false }),
    } as unknown as CrearOfertaMedicaUseCase;
    const publicar = {
      ejecutar: jest.fn().mockResolvedValue({ agendaId: 'ag-1', publicada: true }),
    } as unknown as PublicarAgendaUseCase;
    const bloquear = {
      ejecutar: jest.fn().mockResolvedValue({ slotsAfectados: 2 }),
    } as unknown as BloquearSlotsUseCase;

    const controller = new AgendaController(consultar, crear, publicar, bloquear);

    await expect(
      controller.buscarDisponibilidad({ especialidadId: 'esp-1', fecha: '2099-12-01' }),
    ).resolves.toEqual([]);
    await expect(
      controller.crearOferta({
        medicoId: 'med-1',
        especialidadId: 'esp-1',
        consultorioId: 'cons-1',
        fecha: '2099-12-01',
        horaInicio: '08:00',
        horaFin: '09:00',
        duracionMin: 15,
        fechaApertura: '2099-11-28T07:00:00.000Z',
      }),
    ).resolves.toMatchObject({ agendaId: 'ag-1' });
    await expect(controller.publicar('ag-1')).resolves.toEqual({
      agendaId: 'ag-1',
      publicada: true,
    });
    await expect(
      controller.bloquear({ medicoId: 'med-1', fecha: '2099-12-01', motivo: 'Feriado' }),
    ).resolves.toEqual({ slotsAfectados: 2 });
  });
});
