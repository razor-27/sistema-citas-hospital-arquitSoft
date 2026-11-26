import { AgendaMedica } from '../../../src/modulos/agenda/dominio/agenda-medica.entity';
import { EstadoSlot, TurnoDia } from '../../../src/modulos/agenda/dominio/estado-slot.vo';
import { TurnoSlot } from '../../../src/modulos/agenda/dominio/turno-slot.entity';

describe('AgendaMedica y TurnoSlot (Dominio)', () => {
  const baseInput = {
    medicoId: 'med-1',
    especialidadId: 'esp-1',
    consultorioId: 'cons-1',
    fecha: '2026-12-10',
    horaInicio: '08:00',
    horaFin: '09:00',
    duracionMin: 20,
    fechaApertura: new Date('2026-11-30T07:00:00.000Z'),
  };

  it('debe generar la cantidad exacta de slots según la duración configurada', () => {
    const agenda = AgendaMedica.crear(baseInput);

    expect(agenda.slots).toHaveLength(3);
    expect(agenda.publicada).toBe(false);
    expect(agenda.slots[0].turno).toBe(TurnoDia.MANANA);
    expect(agenda.slots[0].estado).toBe(EstadoSlot.DISPONIBLE);
  });

  it('debe asignar TurnoDia.TARDE a slots desde las 13:00', () => {
    const agenda = AgendaMedica.crear({
      ...baseInput,
      horaInicio: '14:00',
      horaFin: '15:00',
      duracionMin: 30,
    });

    expect(agenda.slots).toHaveLength(2);
    expect(agenda.slots.every((s) => s.turno === TurnoDia.TARDE)).toBe(true);
  });

  it('debe rechazar duraciones distintas a 15, 20 o 30 minutos', () => {
    expect(() => AgendaMedica.crear({ ...baseInput, duracionMin: 25 })).toThrow(
      /15, 20 o 30 minutos/,
    );
  });

  it('debe rechazar rango horario inválido o menor a la duración', () => {
    expect(() =>
      AgendaMedica.crear({ ...baseInput, horaInicio: '10:00', horaFin: '09:00' }),
    ).toThrow(/posterior/);

    expect(() =>
      AgendaMedica.crear({ ...baseInput, horaInicio: '08:00', horaFin: '08:10', duracionMin: 20 }),
    ).toThrow(/menor a la duración/);
  });

  it('debe publicar una agenda y rechazar doble publicación', () => {
    const agenda = AgendaMedica.crear(baseInput);
    agenda.publicar();
    expect(agenda.publicada).toBe(true);
    expect(() => agenda.publicar()).toThrow(/ya se encuentra publicada/);
  });

  it('debe gestionar las transiciones de estado de TurnoSlot correctamente', () => {
    const agenda = AgendaMedica.crear(baseInput);
    const slot: TurnoSlot = agenda.slots[0];

    expect(slot.estaDisponible()).toBe(true);
    slot.marcarComoReservado();
    expect(slot.estado).toBe(EstadoSlot.RESERVADO);
    expect(() => slot.marcarComoReservado()).toThrow(/no está disponible/);

    slot.liberar();
    expect(slot.estado).toBe(EstadoSlot.DISPONIBLE);

    slot.bloquear('Feriado regional');
    expect(slot.estado).toBe(EstadoSlot.BLOQUEADO);
    expect(slot.motivoBloqueo).toBe('Feriado regional');
    expect(() => slot.liberar()).toThrow(/bloqueado por contingencia/);
  });
});
