import { Injectable, Logger } from '@nestjs/common';
import { NotificacionPort, Notificacion, ResultadoEnvio } from '../dominio/notificacion.port';

/**
 * WhatsAppCloudAdapter — Implementación de pasarela WhatsApp Business Cloud API.
 * En producción: HTTP POST a graph.facebook.com/v18.0/{phoneNumberId}/messages
 */
@Injectable()
export class WhatsAppCloudAdapter implements NotificacionPort {
  private readonly logger = new Logger(WhatsAppCloudAdapter.name);

  soportaCanal(canal: string): boolean {
    return canal === 'WHATSAPP';
  }

  async enviar(notificacion: Notificacion): Promise<ResultadoEnvio> {
    this.logger.log(
      `[WhatsApp] → ${notificacion.destinatario}: ${notificacion.mensaje.substring(0, 50)}...`,
    );

    // En producción: llamada real a WhatsApp Cloud API
    // const response = await fetch(`${process.env.WA_API_URL}/messages`, { method: 'POST', ... });
    return { exitoso: true };
  }
}

/**
 * TwilioSmsAdapter — Implementación de pasarela SMS con Twilio.
 */
@Injectable()
export class TwilioSmsAdapter implements NotificacionPort {
  private readonly logger = new Logger(TwilioSmsAdapter.name);

  soportaCanal(canal: string): boolean {
    return canal === 'SMS';
  }

  async enviar(notificacion: Notificacion): Promise<ResultadoEnvio> {
    this.logger.log(
      `[SMS/Twilio] → ${notificacion.destinatario}: ${notificacion.mensaje.substring(0, 50)}...`,
    );
    return { exitoso: true };
  }
}
