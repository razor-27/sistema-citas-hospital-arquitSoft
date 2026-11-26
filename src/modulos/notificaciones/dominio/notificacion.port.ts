export interface Notificacion {
  destinatario: string;
  canal: 'WHATSAPP' | 'SMS' | 'EMAIL';
  asunto?: string;
  mensaje: string;
  metadata?: Record<string, unknown>;
}

export interface ResultadoEnvio {
  exitoso: boolean;
  error?: string;
  intentos?: number;
}

/** Puerto de salida para canal de notificaciones */
export abstract class NotificacionPort {
  abstract enviar(notificacion: Notificacion): Promise<ResultadoEnvio>;
  abstract soportaCanal(canal: string): boolean;
}
