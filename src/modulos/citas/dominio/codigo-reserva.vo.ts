import { randomBytes } from 'node:crypto';
import { ReglaNegocioError } from '../../../shared/errores';

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Value Object para el código alfanumérico único de comprobante de cita.
 */
export class CodigoReserva {
  private constructor(readonly valor: string) {}

  static crear(valor: string): CodigoReserva {
    const normalizado = valor.trim().toUpperCase();
    if (!/^CIT-[A-Z0-9]{6,8}$/.test(normalizado)) {
      throw new ReglaNegocioError(`Código de reserva inválido: ${valor}`);
    }
    return new CodigoReserva(normalizado);
  }

  static generarAleatorio(): CodigoReserva {
    const bytes = randomBytes(6);
    let sufijo = '';
    for (let i = 0; i < 6; i += 1) {
      sufijo += ALFABETO[bytes[i] % ALFABETO.length];
    }
    return new CodigoReserva(`CIT-${sufijo}`);
  }
}
