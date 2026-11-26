import { ReglaNegocioError } from '../../../shared/errores';
import { EstadoSlot, TurnoDia } from './estado-slot.vo';

export interface TurnoSlotProps {
  readonly id: string;
  readonly agendaId: string;
  readonly medicoId: string;
  readonly especialidadId: string;
  readonly consultorioId: string;
  readonly sedeId: string;
  readonly fechaHoraInicio: Date;
  readonly fechaHoraFin: Date;
  readonly turno: TurnoDia;
  estado: EstadoSlot;
  motivoBloqueo?: string | null;
  version: number;
}

/**
 * Entidad de Dominio TurnoSlot (equivalente al recurso HL7 FHIR Slot).
 */
export class TurnoSlot {
  private constructor(private readonly props: TurnoSlotProps) {}

  static reconstruir(props: TurnoSlotProps): TurnoSlot {
    return new TurnoSlot({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get agendaId(): string {
    return this.props.agendaId;
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

  get sedeId(): string {
    return this.props.sedeId;
  }

  get fechaHoraInicio(): Date {
    return this.props.fechaHoraInicio;
  }

  get fechaHoraFin(): Date {
    return this.props.fechaHoraFin;
  }

  get turno(): TurnoDia {
    return this.props.turno;
  }

  get estado(): EstadoSlot {
    return this.props.estado;
  }

  get motivoBloqueo(): string | null {
    return this.props.motivoBloqueo ?? null;
  }

  get version(): number {
    return this.props.version;
  }

  estaDisponible(): boolean {
    return this.props.estado === EstadoSlot.DISPONIBLE;
  }

  marcarComoReservado(): void {
    if (!this.estaDisponible()) {
      throw new ReglaNegocioError(
        `El cupo ${this.props.id} no está disponible (estado actual: ${this.props.estado}).`,
      );
    }
    this.props.estado = EstadoSlot.RESERVADO;
    this.props.version += 1;
  }

  liberar(): void {
    if (this.props.estado === EstadoSlot.BLOQUEADO) {
      throw new ReglaNegocioError('No se puede liberar un cupo bloqueado por contingencia.');
    }
    this.props.estado = EstadoSlot.DISPONIBLE;
    this.props.version += 1;
  }

  bloquear(motivo: string): void {
    if (!motivo || motivo.trim().length < 3) {
      throw new ReglaNegocioError('Debe indicar un motivo válido para bloquear el cupo.');
    }
    this.props.estado = EstadoSlot.BLOQUEADO;
    this.props.motivoBloqueo = motivo.trim();
    this.props.version += 1;
  }
}
