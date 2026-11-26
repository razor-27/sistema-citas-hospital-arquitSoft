import { Inject, Injectable } from '@nestjs/common';
import {
  DISPONIBILIDAD_PORT,
  DisponibilidadPort,
  FiltroDisponibilidad,
  SlotDisponibleResumen,
} from '../dominio/disponibilidad.port';

@Injectable()
export class ConsultarDisponibilidadUseCase {
  constructor(
    @Inject(DISPONIBILIDAD_PORT)
    private readonly disponibilidad: DisponibilidadPort,
  ) {}

  async ejecutar(filtro: FiltroDisponibilidad): Promise<SlotDisponibleResumen[]> {
    const hoy = new Date().toISOString().slice(0, 10);
    if (filtro.fecha < hoy) {
      return [];
    }
    return this.disponibilidad.buscarDisponibles(filtro);
  }
}
