import { ForbiddenException } from '@nestjs/common';
import { CancelarCitaUseCase } from '../../../src/modulos/citas/aplicacion/cancelar-cita.use-case';
import { CheckInUseCase } from '../../../src/modulos/citas/aplicacion/check-in.use-case';
import { ConsultarCitasUseCase } from '../../../src/modulos/citas/aplicacion/consultar-citas.use-case';
import { AccionEstadoClinico } from '../../../src/modulos/citas/aplicacion/dtos/citas.dtos';
import { RegistrarSobrecupoUseCase } from '../../../src/modulos/citas/aplicacion/registrar-sobrecupo.use-case';
import { ReprogramarCitaUseCase } from '../../../src/modulos/citas/aplicacion/reprogramar-cita.use-case';
import { ReservarCitaUseCase } from '../../../src/modulos/citas/aplicacion/reservar-cita.use-case';
import { EstadoCita } from '../../../src/modulos/citas/dominio/estado-cita.vo';
import { PoliticaReservaService } from '../../../src/modulos/citas/dominio/politica-reserva.service';
import { CitaController } from '../../../src/modulos/citas/presentacion/cita.controller';
import { VentanillaCitaController } from '../../../src/modulos/citas/presentacion/ventanilla-cita.controller';
import { ReglaNegocioError } from '../../../src/shared/errores';
import { InMemoryEventBus } from '../../../src/shared/eventos/domain-event';
import { InMemoryCitaRepository, InMemoryDistributedLock } from './in-memory-citas.double';

describe('Gestión de Citas, Ventanilla, Check-in y Controladores', () => {
  let repo: InMemoryCitaRepository;
  let lock: InMemoryDistributedLock;
  let eventBus: InMemoryEventBus;
  let politica: PoliticaReservaService;
  let reservar: ReservarCitaUseCase;
  let cancelar: CancelarCitaUseCase;
  let reprogramar: ReprogramarCitaUseCase;
  let checkIn: CheckInUseCase;
  let sobrecupo: RegistrarSobrecupoUseCase;
  let consultar: ConsultarCitasUseCase;

  beforeEach(() => {
    repo = new InMemoryCitaRepository();
    lock = new InMemoryDistributedLock();
    eventBus = new InMemoryEventBus();
    politica = new PoliticaReservaService();

    reservar = new ReservarCitaUseCase(repo, lock, eventBus, politica);
    cancelar = new CancelarCitaUseCase(repo, eventBus, politica);
    reprogramar = new ReprogramarCitaUseCase(repo, lock, eventBus, politica);
    checkIn = new CheckInUseCase(repo, eventBus, politica);
    sobrecupo = new RegistrarSobrecupoUseCase(repo, eventBus, politica);
    consultar = new ConsultarCitasUseCase(repo, eventBus);

    repo.seedSlot({
      id: 'slot-1',
      medicoId: 'med-1',
      especialidadId: 'esp-1',
      fechaHoraInicio: new Date('2099-12-20T09:00:00.000Z'),
      estado: 'DISPONIBLE',
      agendaPublicada: true,
    });
    repo.seedSlot({
      id: 'slot-2',
      medicoId: 'med-1',
      especialidadId: 'esp-1',
      fechaHoraInicio: new Date('2099-12-21T10:00:00.000Z'),
      estado: 'DISPONIBLE',
      agendaPublicada: true,
    });
  });

  it('debe cancelar una cita y liberar el slot inmediatamente', async () => {
    const creada = await reservar.ejecutar({ slotId: 'slot-1', pacienteId: 'pac-1' }, 'pac-1');
    const cancelada = await cancelar.ejecutar(creada.id, 'Motivo personal', 'pac-1', false);

    expect(cancelada.estado).toBe(EstadoCita.CANCELADA);
    expect(repo.slots.get('slot-1')?.info.estado).toBe('DISPONIBLE');
  });

  it('debe reprogramar una cita liberando el slot anterior y reservando el nuevo', async () => {
    const creada = await reservar.ejecutar({ slotId: 'slot-1', pacienteId: 'pac-1' }, 'pac-1');
    const rep = await reprogramar.ejecutar(creada.id, 'slot-2', 'pac-1', false);

    expect(rep.slotId).toBe('slot-2');
    expect(repo.slots.get('slot-1')?.info.estado).toBe('DISPONIBLE');
    expect(repo.slots.get('slot-2')?.info.estado).toBe('RESERVADO');
  });

  it('debe realizar check-in en ventana de 45-10 min previos y marcar atendida', async () => {
    const creada = await reservar.ejecutar({ slotId: 'slot-1', pacienteId: 'pac-1' }, 'pac-1');
    const ahoraValido = new Date('2099-12-20T08:35:00.000Z'); // 25 min antes

    const enSala = await checkIn.ejecutar(creada.id, 'pac-1', ahoraValido);
    expect(enSala.estado).toBe(EstadoCita.EN_SALA);

    const atendida = await consultar.actualizarEstadoClinico(
      creada.id,
      AccionEstadoClinico.ATENDIDA,
      'med-1',
    );
    expect(atendida.estado).toBe(EstadoCita.ATENDIDA);
  });

  it('debe registrar sobrecupo respetando el límite diario por especialidad', async () => {
    repo.maxSobrecupos = 1;
    const s1 = await sobrecupo.ejecutar(
      { slotId: 'slot-1', pacienteId: 'pac-1', motivoSobrecupo: 'Urgencia autorizada' },
      'adm-1',
    );
    expect(s1.esSobrecupo).toBe(true);

    await expect(
      sobrecupo.ejecutar(
        { slotId: 'slot-1', pacienteId: 'pac-2', motivoSobrecupo: 'Segunda urgencia' },
        'adm-1',
      ),
    ).rejects.toThrow(ReglaNegocioError);
  });

  it('debe bloquear acceso IDOR en obtenerPorId y delegar correctamente en controladores', async () => {
    const creada = await reservar.ejecutar({ slotId: 'slot-1', pacienteId: 'pac-1' }, 'pac-1');

    await expect(consultar.obtenerPorId(creada.id, 'otro-paciente', false)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(consultar.obtenerPorId(creada.id, 'adm-1', true)).resolves.toMatchObject({
      id: creada.id,
    });

    const citaCtrl = new CitaController(reservar, cancelar, reprogramar, checkIn, consultar);
    const ventanillaCtrl = new VentanillaCitaController(sobrecupo);

    const req = { user: { sub: 'pac-1', rol: 'PACIENTE' }, ip: '127.0.0.1' } as never;
    const reqAdm = { user: { sub: 'adm-1', rol: 'ADMISION' }, ip: '127.0.0.1' } as never;
    const reqAnon = { ip: '127.0.0.1' } as never;

    const mias = await citaCtrl.listarMias({}, req);
    expect(mias).toHaveLength(1);
    await expect(citaCtrl.listarMias({ pacienteId: 'pac-1' }, reqAnon)).resolves.toHaveLength(1);

    const agendaMed = await citaCtrl.agendaMedica({ medicoId: 'med-1', fecha: '2099-12-20' });
    expect(agendaMed).toHaveLength(1);

    const reqOtro = { user: { sub: 'pac-otro', rol: 'PACIENTE' }, ip: '127.0.0.1' } as never;
    await expect(citaCtrl.obtenerPorId(creada.id, reqAdm)).resolves.toMatchObject({
      id: creada.id,
    });
    await expect(citaCtrl.obtenerPorId(creada.id, reqOtro)).rejects.toThrow();

    repo.seedSlot({
      id: 'slot-3',
      medicoId: 'med-1',
      especialidadId: 'esp-1',
      fechaHoraInicio: new Date('2099-12-22T10:00:00.000Z'),
      estado: 'DISPONIBLE',
      agendaPublicada: true,
    });
    const nuevaCtrl = await citaCtrl.reservar({ slotId: 'slot-3', pacienteId: 'pac-3' }, reqAnon);
    await expect(
      citaCtrl.reprogramar(nuevaCtrl.id, { nuevoSlotId: 'slot-2' }, reqAdm),
    ).resolves.toMatchObject({ slotId: 'slot-2' });
    await expect(
      citaCtrl.cancelar(nuevaCtrl.id, { motivo: 'Cancelación en ventanilla' }, reqAdm),
    ).resolves.toMatchObject({ estado: EstadoCita.CANCELADA });

    await expect(
      citaCtrl.actualizarEstadoClinico(
        creada.id,
        { accion: AccionEstadoClinico.NO_ASISTIO },
        reqAnon,
      ),
    ).resolves.toMatchObject({ estado: EstadoCita.NO_ASISTIO });

    const sc = await ventanillaCtrl.crearSobrecupo(
      { slotId: 'slot-2', pacienteId: 'pac-2', motivoSobrecupo: 'Autorizado jefatura' },
      reqAdm,
    );
    expect(sc.esSobrecupo).toBe(true);
  });

  it('debe lanzar RecursoNoEncontradoError cuando la cita o slot no existen en casos de uso', async () => {
    await expect(cancelar.ejecutar('no-existe', 'motivo', 'pac-1')).rejects.toThrow(
      /no encontrada/,
    );
    await expect(reprogramar.ejecutar('no-existe', 'slot-2', 'pac-1')).rejects.toThrow(
      /no encontrada/,
    );
    await expect(checkIn.ejecutar('no-existe', 'pac-1')).rejects.toThrow(/no encontrada/);
    await expect(
      sobrecupo.ejecutar(
        { slotId: 'slot-no-existe', pacienteId: 'pac-1', motivoSobrecupo: 'Urgencia' },
        'adm-1',
      ),
    ).rejects.toThrow(/no encontrado/);
    await expect(consultar.obtenerPorId('no-existe', 'pac-1')).rejects.toThrow(/no encontrada/);
    await expect(
      consultar.actualizarEstadoClinico('no-existe', AccionEstadoClinico.ATENDIDA, 'med-1'),
    ).rejects.toThrow(/no encontrada/);
  });
});
