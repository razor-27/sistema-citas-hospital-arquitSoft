import { randomUUID } from 'node:crypto';
import { ReglaNegocioError } from '../../../shared/errores';
import { CodigoReserva } from './codigo-reserva.vo';
import { EstadoCita } from './estado-cita.vo';

export interface CrearCitaProps {
  readonly pacienteId: string;
  readonly slotId: string;
  readonly medicoId: string;
  readonly especialidadId: string;
  readonly fechaHoraInicio: Date;
  readonly creadoPor: string;
  readonly esSobrecupo?: boolean;
  readonly motivoSobrecupo?: string;
}

export interface CitaProps {
  readonly id: string;
  readonly codigoReserva: CodigoReserva;
  readonly pacienteId: string;
  slotId: string;
  readonly medicoId: string;
  readonly especialidadId: string;
  fechaHoraInicio: Date;
  estado: EstadoCita;
  readonly esSobrecupo: boolean;
  readonly motivoSobrecupo: string | null;
  motivoCancelacion: string | null;
  readonly creadoPor: string;
  readonly createdAt: Date;
  updatedAt: Date;
}

/**
 * Entidad de Dominio Cita (equivalente al recurso HL7 FHIR Appointment).
 */
export class Cita {
  private constructor(private readonly props: CitaProps) {}

  static crear(input: CrearCitaProps): Cita {
    if (!input.pacienteId) {
      throw new ReglaNegocioError('RN-01: La cita requiere un paciente válido.');
    }
    if (!input.slotId) {
      throw new ReglaNegocioError('RN-02: La cita requiere un cupo horario (slot).');
    }
    if (input.esSobrecupo && (!input.motivoSobrecupo || input.motivoSobrecupo.trim().length < 5)) {
      throw new ReglaNegocioError('RN-03: Todo sobrecupo requiere una justificación válida.');
    }

    const ahora = new Date();
    return new Cita({
      id: randomUUID(),
      codigoReserva: CodigoReserva.generarAleatorio(),
      pacienteId: input.pacienteId,
      slotId: input.slotId,
      medicoId: input.medicoId,
      especialidadId: input.especialidadId,
      fechaHoraInicio: input.fechaHoraInicio,
      estado: EstadoCita.RESERVADA,
      esSobrecupo: Boolean(input.esSobrecupo),
      motivoSobrecupo: input.motivoSobrecupo?.trim() ?? null,
      motivoCancelacion: null,
      creadoPor: input.creadoPor,
      createdAt: ahora,
      updatedAt: ahora,
    });
  }

  static reconstruir(props: CitaProps): Cita {
    return new Cita({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get codigoReserva(): CodigoReserva {
    return this.props.codigoReserva;
  }

  get pacienteId(): string {
    return this.props.pacienteId;
  }

  get slotId(): string {
    return this.props.slotId;
  }

  get medicoId(): string {
    return this.props.medicoId;
  }

  get especialidadId(): string {
    return this.props.especialidadId;
  }

  get fechaHoraInicio(): Date {
    return this.props.fechaHoraInicio;
  }

  get estado(): EstadoCita {
    return this.props.estado;
  }

  get esSobrecupo(): boolean {
    return this.props.esSobrecupo;
  }

  get motivoSobrecupo(): string | null {
    return this.props.motivoSobrecupo;
  }

  get motivoCancelacion(): string | null {
    return this.props.motivoCancelacion;
  }

  get creadoPor(): string {
    return this.props.creadoPor;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  confirmar(): void {
    if (this.props.estado !== EstadoCita.RESERVADA) {
      throw new ReglaNegocioError('Solo una cita en estado RESERVADA puede confirmarse.');
    }
    this.props.estado = EstadoCita.CONFIRMADA;
    this.props.updatedAt = new Date();
  }

  cancelar(motivo: string): void {
    if (this.props.estado === EstadoCita.ATENDIDA) {
      throw new ReglaNegocioError('Una cita ya atendida no puede cancelarse.');
    }
    if (this.props.estado === EstadoCita.CANCELADA) {
      throw new ReglaNegocioError('La cita ya se encuentra cancelada.');
    }
    if (!motivo || motivo.trim().length < 3) {
      throw new ReglaNegocioError('Debe indicar un motivo válido de cancelación.');
    }
    this.props.estado = EstadoCita.CANCELADA;
    this.props.motivoCancelacion = motivo.trim();
    this.props.updatedAt = new Date();
  }

  reprogramar(nuevoSlotId: string, nuevaFechaHoraInicio: Date): void {
    if (this.props.estado !== EstadoCita.RESERVADA && this.props.estado !== EstadoCita.CONFIRMADA) {
      throw new ReglaNegocioError(
        'Solo citas activas (RESERVADA/CONFIRMADA) pueden reprogramarse.',
      );
    }
    this.props.slotId = nuevoSlotId;
    this.props.fechaHoraInicio = nuevaFechaHoraInicio;
    this.props.updatedAt = new Date();
  }

  realizarCheckIn(): void {
    if (this.props.estado !== EstadoCita.CONFIRMADA && this.props.estado !== EstadoCita.RESERVADA) {
      throw new ReglaNegocioError('No se puede realizar check-in a una cita inactiva o cancelada.');
    }
    this.props.estado = EstadoCita.EN_SALA;
    this.props.updatedAt = new Date();
  }

  marcarAtendida(): void {
    if (
      this.props.estado !== EstadoCita.EN_SALA &&
      this.props.estado !== EstadoCita.CONFIRMADA &&
      this.props.estado !== EstadoCita.RESERVADA
    ) {
      throw new ReglaNegocioError('La cita no está en un estado válido para marcarse atendida.');
    }
    this.props.estado = EstadoCita.ATENDIDA;
    this.props.updatedAt = new Date();
  }

  marcarNoAsistio(): void {
    if (this.props.estado !== EstadoCita.RESERVADA && this.props.estado !== EstadoCita.CONFIRMADA) {
      throw new ReglaNegocioError('Solo citas sin check-in pueden marcarse como inasistencia.');
    }
    this.props.estado = EstadoCita.NO_ASISTIO;
    this.props.updatedAt = new Date();
  }
}
