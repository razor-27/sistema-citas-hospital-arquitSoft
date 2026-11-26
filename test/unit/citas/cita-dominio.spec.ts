import { Cita } from '../../../src/modulos/citas/dominio/cita.entity';
import { CodigoReserva } from '../../../src/modulos/citas/dominio/codigo-reserva.vo';
import { EstadoCita } from '../../../src/modulos/citas/dominio/estado-cita.vo';
import { PoliticaReservaService } from '../../../src/modulos/citas/dominio/politica-reserva.service';

describe('Cita, CodigoReserva y PoliticaReservaService (Dominio)', () => {
  const baseProps = {
    pacienteId: 'pac-1',
    slotId: 'slot-1',
    medicoId: 'med-1',
    especialidadId: 'esp-1',
    fechaHoraInicio: new Date('2099-12-15T09:00:00.000Z'),
    creadoPor: 'pac-1',
  };

  it('debe crear una cita válida con código único en estado RESERVADA', () => {
    const cita = Cita.crear(baseProps);
    expect(cita.estado).toBe(EstadoCita.RESERVADA);
    expect(cita.codigoReserva.valor).toMatch(/^CIT-[A-Z0-9]{6}$/);
    expect(cita.esSobrecupo).toBe(false);
  });

  it('debe validar RN-01, RN-02, RN-03 y CodigoReserva', () => {
    expect(() => Cita.crear({ ...baseProps, pacienteId: '' })).toThrow(/RN-01/);
    expect(() => Cita.crear({ ...baseProps, slotId: '' })).toThrow(/RN-02/);
    expect(() => Cita.crear({ ...baseProps, esSobrecupo: true, motivoSobrecupo: 'abc' })).toThrow(
      /RN-03/,
    );
    expect(() => CodigoReserva.crear('INVALIDO')).toThrow(/Código de reserva inválido/);
    expect(CodigoReserva.crear('cit-ab12cd').valor).toBe('CIT-AB12CD');
  });

  it('debe ejecutar transiciones de estado clínicas válidas e impedir inválidas', () => {
    const cita = Cita.crear(baseProps);
    cita.confirmar();
    expect(cita.estado).toBe(EstadoCita.CONFIRMADA);
    expect(() => cita.confirmar()).toThrow(/RESERVADA/);

    cita.realizarCheckIn();
    expect(cita.estado).toBe(EstadoCita.EN_SALA);
    expect(() => cita.marcarNoAsistio()).toThrow(/sin check-in/);

    cita.marcarAtendida();
    expect(cita.estado).toBe(EstadoCita.ATENDIDA);
    expect(() => cita.cancelar('motivo')).toThrow(/ya atendida/);
    expect(() => cita.realizarCheckIn()).toThrow(/inactiva o cancelada/);
  });

  it('debe permitir cancelar y marcar inasistencia cuando corresponde', () => {
    const c1 = Cita.crear(baseProps);
    c1.cancelar('Viaje imprevisto');
    expect(c1.estado).toBe(EstadoCita.CANCELADA);
    expect(() => c1.cancelar('Otro')).toThrow(/ya se encuentra cancelada/);

    const c2 = Cita.crear(baseProps);
    c2.marcarNoAsistio();
    expect(c2.estado).toBe(EstadoCita.NO_ASISTIO);
  });

  it('debe validar las reglas de PoliticaReservaService', () => {
    const politica = new PoliticaReservaService();

    expect(() => politica.validarSinDuplicidadPaciente(true)).toThrow(/cita activa/);
    politica.validarSinDuplicidadPaciente(false);

    const inicio = new Date('2026-12-15T10:00:00.000Z');
    const antes24h = new Date('2026-12-14T09:00:00.000Z');
    const menos24h = new Date('2026-12-15T00:00:00.000Z');

    politica.validarAnticipacionCambio(inicio, antes24h, false);
    expect(() => politica.validarAnticipacionCambio(inicio, menos24h, false)).toThrow(/24 horas/);
    politica.validarAnticipacionCambio(inicio, menos24h, true); // admisión puede

    const dentroCheckIn = new Date('2026-12-15T09:30:00.000Z'); // 30 min antes
    const muyTemprano = new Date('2026-12-15T08:50:00.000Z'); // 70 min antes
    politica.validarVentanaCheckIn(inicio, dentroCheckIn);
    expect(() => politica.validarVentanaCheckIn(inicio, muyTemprano)).toThrow(/45 y 10 minutos/);

    politica.validarLimiteSobrecupo(1, 2);
    expect(() => politica.validarLimiteSobrecupo(2, 2)).toThrow(/límite diario/);
  });
});
