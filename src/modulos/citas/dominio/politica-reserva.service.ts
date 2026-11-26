import { ReglaNegocioError } from '../../../shared/errores';

const HORAS_MIN_ANTICIPACION_CAMBIO = 24;
const MINUTOS_CHECKIN_ANTES_MAX = 45;
const MINUTOS_CHECKIN_ANTES_MIN = 10;

/**
 * Servicio de Dominio con las reglas clínicas de elegibilidad y ventanas de tiempo.
 */
export class PoliticaReservaService {
  validarSinDuplicidadPaciente(tieneCitaActivaMismaEspecialidadFecha: boolean): void {
    if (tieneCitaActivaMismaEspecialidadFecha) {
      throw new ReglaNegocioError(
        'El paciente ya cuenta con una cita activa para la misma especialidad en esa fecha.',
      );
    }
  }

  validarAnticipacionCambio(fechaHoraInicio: Date, ahora = new Date(), esAdmision = false): void {
    if (esAdmision) return;
    const diffHoras = (fechaHoraInicio.getTime() - ahora.getTime()) / (1000 * 60 * 60);
    if (diffHoras < HORAS_MIN_ANTICIPACION_CAMBIO) {
      throw new ReglaNegocioError(
        `Las cancelaciones o reprogramaciones requieren al menos ${HORAS_MIN_ANTICIPACION_CAMBIO} horas de anticipación.`,
      );
    }
  }

  validarVentanaCheckIn(fechaHoraInicio: Date, ahora = new Date()): void {
    const diffMin = (fechaHoraInicio.getTime() - ahora.getTime()) / (1000 * 60);
    if (diffMin > MINUTOS_CHECKIN_ANTES_MAX || diffMin < MINUTOS_CHECKIN_ANTES_MIN) {
      throw new ReglaNegocioError(
        `El check-in solo está habilitado entre ${MINUTOS_CHECKIN_ANTES_MAX} y ${MINUTOS_CHECKIN_ANTES_MIN} minutos antes de la cita.`,
      );
    }
  }

  validarLimiteSobrecupo(sobrecuposActualesDia: number, maxSobrecuposDia: number): void {
    if (sobrecuposActualesDia >= maxSobrecuposDia) {
      throw new ReglaNegocioError(
        `Se alcanzó el límite diario de sobrecupos (${maxSobrecuposDia}) para esta especialidad.`,
      );
    }
  }
}
