export interface Especialidad {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly maxSobrecuposDia: number;
  readonly activo: boolean;
}

export interface Consultorio {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly piso: string;
  readonly sedeId: string;
  readonly activo: boolean;
}

export interface Medico {
  readonly id: string;
  readonly cmp: string;
  readonly nombres: string;
  readonly apellidos: string;
  readonly especialidadId: string;
  readonly activo: boolean;
}
