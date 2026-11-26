import { Injectable, Logger } from '@nestjs/common';
import { AseguramientoPort, DatosCobertura } from '../dominio/integracion.ports';

/**
 * SISResilientAdapter — Adaptador resiliente para la API del SIS.
 * Circuit Breaker con opossum: timeout 3s, umbral 50%, reset 30s.
 * Fallback: retorna cobertura PENDIENTE_VALIDACION sin abortar el flujo.
 */
@Injectable()
export class SisResilientAdapter implements AseguramientoPort {
  private readonly logger = new Logger(SisResilientAdapter.name);
  private breaker: unknown = null;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.SIS_API_URL ?? 'https://api.sis.gob.pe';
  }

  private async getBreaker() {
    if (!this.breaker) {
      const CircuitBreaker = (await import('opossum')).default;
      this.breaker = new CircuitBreaker(
        async (dni: string): Promise<DatosCobertura> => {
          return this.llamarSIS(dni);
        },
        {
          timeout: 3000,
          errorThresholdPercentage: 50,
          resetTimeout: 30000,
          name: 'sis-circuit',
        },
      );
      (this.breaker as { fallback: (fn: (dni: string) => DatosCobertura) => void }).fallback(
        (dni: string): DatosCobertura => ({
          dni,
          cobertura: 'PARTICULAR',
          activo: false,
          estado: 'PENDIENTE_VALIDACION',
        }),
      );
    }
    return this.breaker as { fire: (dni: string) => Promise<DatosCobertura> };
  }

  async consultar(dni: string): Promise<DatosCobertura> {
    const breaker = await this.getBreaker();
    return breaker.fire(dni);
  }

  private async llamarSIS(dni: string): Promise<DatosCobertura> {
    this.logger.log(`Consultando SIS para DNI: ${dni}`);
    throw new Error('API SIS no disponible en entorno de desarrollo');
  }
}
