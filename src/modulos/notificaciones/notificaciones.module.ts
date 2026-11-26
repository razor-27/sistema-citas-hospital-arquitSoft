import { Module } from '@nestjs/common';
import {
  NotificacionesConsumer,
  NOTIFICACION_WHATSAPP,
  NOTIFICACION_SMS,
} from './infraestructura/notificaciones.consumer';
import { WhatsAppCloudAdapter, TwilioSmsAdapter } from './infraestructura/notificacion-adapters';

@Module({
  providers: [
    NotificacionesConsumer,
    { provide: NOTIFICACION_WHATSAPP, useClass: WhatsAppCloudAdapter },
    { provide: NOTIFICACION_SMS, useClass: TwilioSmsAdapter },
  ],
  exports: [NotificacionesConsumer],
})
export class NotificacionesModule {}
