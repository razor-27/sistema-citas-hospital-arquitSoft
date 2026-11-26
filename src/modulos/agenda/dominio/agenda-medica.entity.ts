import { randomUUID } from 'node:crypto';
import { ReglaNegocioError } from '../../../shared/errores';
import { EstadoSlot, TurnoDia } from './estado-slot.vo';
import { TurnoSlot } from './turno-slot.entity';

export type DuracionConsulta = 15 | 20 | 30;
const DURACIONES_VALIDAS: ReadonlySet<number> = new Set([15, 20, 30]);

export interface CrearAgendaProps {
  readonly medicoId: string;
  readonly especialidadId: string;
  readonly consultorioId: string;
  readonly sedeId?: string;
  readonly fecha: string; // YYYY-MM-DD
  readonly horaInicio: string; // HH:mm
  readonly horaFin: string; // HH:mm
  readonly duracionMin: number;
  readonly fechaApertura: Date;
}

export interface AgendaMedicaProps {
  readonly id: string;
  readonly medicoId: string;
  readonly especialidadId: string;
  readonly consultorioId: string;
  readonly fecha: string;
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly duracionMin: DuracionConsulta;
  readonly fechaApertura: Date;
  publicada: boolean;
  readonly slots: TurnoSlot[];
}

/**
 * Entidad de Dominio AgendaMedica (equivalente al recurso HL7 FHIR Schedule).
 */
export class AgendaMedica {
  private constructor(private readonly props: AgendaMedicaProps) {}

  static crear(input: CrearAgendaProps): AgendaMedica {
    if (!DURACIONES_VALIDAS.has(input.duracionMin)) {
      throw new ReglaNegocioError('La duración de consulta debe ser 15, 20 o 30 minutos.');
    }

    const inicioMin = AgendaMedica.parsearHoraAMinutos(input.horaInicio);
    const finMin = AgendaMedica.parsearHoraAMinutos(input.horaFin);

    if (finMin <= inicioMin) {
      throw new ReglaNegocioError('La hora de fin debe ser posterior a la hora de inicio.');
    }

    if (finMin - inicioMin < input.duracionMin) {
      throw new ReglaNegocioError('El rango horario es menor a la duración de un turno.');
    }

    const agendaId = randomUUID();
    const sedeId = input.sedeId ?? 'HUAMANGA-CENTRAL';
    const slots: TurnoSlot[] = [];

    for (
      let cursor = inicioMin;
      cursor + input.duracionMin <= finMin;
      cursor += input.duracionMin
    ) {
      const fechaInicio = AgendaMedica.construirFechaUtc(input.fecha, cursor);
      const fechaFin = AgendaMedica.construirFechaUtc(input.fecha, cursor + input.duracionMin);
      const turno = cursor < 13 * 60 ? TurnoDia.MANANA : TurnoDia.TARDE;

      slots.push(
        TurnoSlot.reconstruir({
          id: randomUUID(),
          agendaId,
          medicoId: input.medicoId,
          especialidadId: input.especialidadId,
          consultorioId: input.consultorioId,
          sedeId,
          fechaHoraInicio: fechaInicio,
          fechaHoraFin: fechaFin,
          turno,
          estado: EstadoSlot.DISPONIBLE,
          motivoBloqueo: null,
          version: 1,
        }),
      );
    }

    return new AgendaMedica({
      id: agendaId,
      medicoId: input.medicoId,
      especialidadId: input.especialidadId,
      consultorioId: input.consultorioId,
      fecha: input.fecha,
      horaInicio: input.horaInicio,
      horaFin: input.horaFin,
      duracionMin: input.duracionMin as DuracionConsulta,
      fechaApertura: input.fechaApertura,
      publicada: false,
      slots,
    });
  }

  static reconstruir(props: AgendaMedicaProps): AgendaMedica {
    return new AgendaMedica({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get medicoId(): string {
    return this.props.medicoId;
  }

  get especialidadId(): string {
    return this.props.especialidadId;
  }

  get consultorioId(): string {
    return this.props.consultorioId;
  }

  get fecha(): string {
    return this.props.fecha;
  }

  get horaInicio(): string {
    return this.props.horaInicio;
  }

  get horaFin(): string {
    return this.props.horaFin;
  }

  get duracionMin(): DuracionConsulta {
    return this.props.duracionMin;
  }

  get fechaApertura(): Date {
    return this.props.fechaApertura;
  }

  get publicada(): boolean {
    return this.props.publicada;
  }

  get slots(): readonly TurnoSlot[] {
    return this.props.slots;
  }

  publicar(): void {
    if (this.props.publicada) {
      throw new ReglaNegocioError('La agenda médica ya se encuentra publicada.');
    }
    this.props.publicada = true;
  }

  private static parsearHoraAMinutos(hhmm: string): number {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
    if (!match) {
      throw new ReglaNegocioError(`Formato de hora inválido (${hhmm}). Use HH:mm.`);
    }
    return Number(match[1]) * 60 + Number(match[2]);
  }

  private static construirFechaUtc(fecha: string, totalMinutos: number): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new ReglaNegocioError(`Formato de fecha inválido (${fecha}). Use YYYY-MM-DD.`);
    }
    const hh = String(Math.floor(totalMinutos / 60)).padStart(2, '0');
    const mm = String(totalMinutos % 60).padStart(2, '0');
    return new Date(`${fecha}T${hh}:${mm}:00.000Z`);
  }
}
