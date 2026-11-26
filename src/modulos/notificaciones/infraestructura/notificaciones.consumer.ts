import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DomainEvent, EventBusPort } from '../../../shared/eventos/domain-event';
import { NotificacionPort } from '../dominio/notificacion.port';

export const NOTIFICACION_WHATSAPP = 'NOTIFICACION_WHATSAPP';
export const NOTIFICACION_SMS = 'NOTIFICACION_SMS';

interface CitaReservadaPayload {
  citaId?: string;
  codigoReserva?: string;
  pacienteTelefono?: string;
  pacienteEmail?: string;
  medicoNombre?: string;
  especialidad?: string;
  fechaHora?: string;
}

/**
 * NotificacionesConsumer — Suscribe a eventos de dominio y envía notificaciones.
 * Implementa reintentos con backoff exponencial (1s, 2s, 4s, 8s, 16s) → DLQ en memoria.
 * En producción: se reemplaza por un consumer RabbitMQ real.
 */
@Injectable()
export class NotificacionesConsumer implements OnModuleInit {
  private readonly logger = new Logger(NotificacionesConsumer.name);
  private readonly dlq: Array<{ evento: string; payload: unknown; intentos: number }> = [];
  private readonly MAX_INTENTOS = 5;

  constructor(
    @Inject('EVENT_BUS') private readonly eventBus: EventBusPort,
    @Inject(NOTIFICACION_WHATSAPP) private readonly whatsappAdapter: NotificacionPort,
    @Inject(NOTIFICACION_SMS) private readonly smsAdapter: NotificacionPort,
  ) {}

  onModuleInit(): void {
    this.eventBus.suscribir('cita.reservada', async (evento: DomainEvent<CitaReservadaPayload>) => {
      await this.procesarConRetry(evento.nombre, evento.payload);
    });

    this.eventBus.suscribir('cita.cancelada', async (evento: DomainEvent<CitaReservadaPayload>) => {
      await this.procesarCancelacion(evento.payload);
    });
  }

  private async procesarConRetry(
    tipoEvento: string,
    payload: CitaReservadaPayload,
    intento = 1,
  ): Promise<void> {
    try {
      if (!payload.pacienteTelefono) return;

      const mensaje = this.construirMensajeConfirmacion(payload);
      const resultado = await this.whatsappAdapter.enviar({
        destinatario: payload.pacienteTelefono,
        canal: 'WHATSAPP',
        mensaje,
      });

      if (!resultado.exitoso) {
        throw new Error(resultado.error ?? 'Error desconocido');
      }

      this.logger.log(`Notificación ${tipoEvento} enviada. Código: ${payload.codigoReserva}`);
    } catch {
      if (intento < this.MAX_INTENTOS) {
        const delay = Math.pow(2, intento - 1) * 1000;
        this.logger.warn(
          `Reintento ${intento}/${this.MAX_INTENTOS} en ${delay}ms para ${tipoEvento}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.procesarConRetry(tipoEvento, payload, intento + 1);
      }

      this.logger.error(
        `DLQ: ${tipoEvento} falló tras ${this.MAX_INTENTOS} intentos. Enviando a DLQ.`,
      );
      this.dlq.push({ evento: tipoEvento, payload, intentos: this.MAX_INTENTOS });
    }
  }

  private async procesarCancelacion(payload: CitaReservadaPayload): Promise<void> {
    if (!payload.pacienteTelefono) return;
    await this.smsAdapter.enviar({
      destinatario: payload.pacienteTelefono,
      canal: 'SMS',
      mensaje: `Su cita ${payload.codigoReserva ?? ''} ha sido cancelada. Contáctenos para reagendar.`,
    });
  }

  private construirMensajeConfirmacion(payload: CitaReservadaPayload): string {
    return (
      `✅ Cita confirmada | Hospital de Huamanga\n` +
      `Código: ${payload.codigoReserva ?? 'N/A'}\n` +
      `Médico: ${payload.medicoNombre ?? 'N/A'} (${payload.especialidad ?? ''})\n` +
      `Fecha: ${payload.fechaHora ?? 'Por confirmar'}\n` +
      `Lleve su DNI y este código al consultorio.`
    );
  }

  getDlq() {
    return [...this.dlq];
  }
}
