import { Injectable, Inject } from '@nestjs/common';
import { IdentidadPort } from '../dominio/integracion.ports';
import { AseguramientoPort } from '../dominio/integracion.ports';

export const IDENTIDAD_PORT = 'IDENTIDAD_PORT';
export const ASEGURAMIENTO_PORT = 'ASEGURAMIENTO_PORT';

export interface ValidarIdentidadResultado {
  dni: string;
  nombres: string;
  apellidos: string;
  validacionReniec: boolean;
  cobertura: string;
  estadoCobertura: string;
}

@Injectable()
export class ValidarIdentidadUseCase {
  constructor(
    @Inject(IDENTIDAD_PORT) private readonly identidadPort: IdentidadPort,
    @Inject(ASEGURAMIENTO_PORT) private readonly aseguramientoPort: AseguramientoPort,
  ) {}

  async ejecutar(dni: string): Promise<ValidarIdentidadResultado> {
    const [identidad, cobertura] = await Promise.all([
      this.identidadPort.consultar(dni),
      this.aseguramientoPort.consultar(dni),
    ]);

    return {
      dni,
      nombres: identidad.nombres,
      apellidos: identidad.apellidos,
      validacionReniec: identidad.validado,
      cobertura: cobertura.cobertura,
      estadoCobertura: cobertura.estado,
    };
  }
}
