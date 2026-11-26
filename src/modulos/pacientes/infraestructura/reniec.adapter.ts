import { Injectable, Logger } from '@nestjs/common';
import { IdentidadPort, DatosIdentidad } from '../dominio/integracion.ports';

/**
 * ReniecAdapter — Adaptador resiliente para la API de RENIEC.
 * Usa opossum Circuit Breaker con fallback para tolerar fallos.
 * El CircuitBreaker se inicializa de forma lazy para evitar problemas de DI en módulos.
 */
@Injectable()
export class ReniecAdapter implements IdentidadPort {
  private readonly logger = new Logger(ReniecAdapter.name);
  private breaker: unknown = null;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.RENIEC_API_URL ?? 'https://api.reniec.gob.pe';
  }

  private async getBreaker() {
    if (!this.breaker) {
      const CircuitBreaker = (await import('opossum')).default;
      this.breaker = new CircuitBreaker(
        async (dni: string): Promise<DatosIdentidad> => {
          return this.llamarReniec(dni);
        },
        {
          timeout: 3000,
          errorThresholdPercentage: 50,
          resetTimeout: 30000,
          name: 'reniec-circuit',
        },
      );
      (this.breaker as { fallback: (fn: (dni: string) => DatosIdentidad) => void }).fallback(
        (dni: string): DatosIdentidad => ({
          dni,
          nombres: 'PENDIENTE',
          apellidos: 'PENDIENTE',
          validado: false,
        }),
      );
    }
    return this.breaker as { fire: (dni: string) => Promise<DatosIdentidad> };
  }

  async consultar(dni: string): Promise<DatosIdentidad> {
    const breaker = await this.getBreaker();
    return breaker.fire(dni);
  }

  private async llamarReniec(dni: string): Promise<DatosIdentidad> {
    // Implementación real: HTTP call al API de RENIEC
    // En producción se usaría fetch/axios con el token de integración
    this.logger.log(`Consultando RENIEC para DNI: ${dni}`);
    throw new Error('API RENIEC no disponible en entorno de desarrollo');
  }
}
