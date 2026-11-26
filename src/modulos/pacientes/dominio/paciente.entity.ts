export interface DatosPaciente {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento?: Date;
  telefono?: string;
  email?: string;
  cobertura: 'SIS' | 'PARTICULAR' | 'ESSALUD' | 'OTRO';
  validacionReniec: boolean;
  activo: boolean;
}

export class Paciente {
  readonly id: string;
  readonly dni: string;
  readonly nombres: string;
  readonly apellidos: string;
  readonly fechaNacimiento?: Date;
  readonly telefono?: string;
  readonly email?: string;
  readonly cobertura: 'SIS' | 'PARTICULAR' | 'ESSALUD' | 'OTRO';
  readonly validacionReniec: boolean;
  readonly activo: boolean;

  constructor(props: DatosPaciente) {
    this.id = props.id;
    this.dni = props.dni;
    this.nombres = props.nombres;
    this.apellidos = props.apellidos;
    this.fechaNacimiento = props.fechaNacimiento;
    this.telefono = props.telefono;
    this.email = props.email;
    this.cobertura = props.cobertura;
    this.validacionReniec = props.validacionReniec;
    this.activo = props.activo;
  }

  get nombreCompleto(): string {
    return `${this.nombres} ${this.apellidos}`;
  }
}
