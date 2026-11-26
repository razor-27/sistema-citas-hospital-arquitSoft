export interface DatosIdentidad {
  dni: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento?: Date;
  validado: boolean;
}

export interface DatosCobertura {
  dni: string;
  cobertura: 'SIS' | 'PARTICULAR' | 'ESSALUD' | 'OTRO';
  activo: boolean;
  fechaVencimiento?: Date;
  estado: 'ACTIVO' | 'VENCIDO' | 'NO_ENCONTRADO' | 'PENDIENTE_VALIDACION';
}

/** Puerto para consulta de identidad a RENIEC */
export abstract class IdentidadPort {
  abstract consultar(dni: string): Promise<DatosIdentidad>;
}

/** Puerto para consulta de aseguramiento a SIS/ESSALUD */
export abstract class AseguramientoPort {
  abstract consultar(dni: string): Promise<DatosCobertura>;
}
