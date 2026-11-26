import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DomainEvent, EventBusPort } from '../../../shared/eventos/domain-event';
import { AuditoriaRepositoryPort } from '../dominio/auditoria-repository.port';

export const AUDITORIA_REPOSITORY = 'AUDITORIA_REPOSITORY';

@Injectable()
export class AuditoriaListener implements OnModuleInit {
  private readonly logger = new Logger(AuditoriaListener.name);

  constructor(
    @Inject('EVENT_BUS') private readonly eventBus: EventBusPort,
    @Inject(AUDITORIA_REPOSITORY)
    private readonly auditoriaRepo: AuditoriaRepositoryPort,
  ) {}

  onModuleInit(): void {
    const operacionesDeCita = [
      'cita.reservada',
      'cita.cancelada',
      'cita.reprogramada',
      'cita.checkin',
      'cita.atendida',
      'cita.no_asistio',
      'cita.acceso_denegado',
    ];

    for (const tipo of operacionesDeCita) {
      this.eventBus.suscribir(tipo, async (evento: DomainEvent<Record<string, unknown>>) => {
        try {
          const payload = evento.payload as Record<string, unknown>;
          await this.auditoriaRepo.registrar({
            citaId: payload['citaId'] as string | undefined,
            codigoReserva: payload['codigoReserva'] as string | undefined,
            usuarioId: payload['usuarioId'] as string | undefined,
            usuarioDni: payload['usuarioDni'] as string | undefined,
            ip: payload['ip'] as string | undefined,
            operacion: tipo,
            estadoAnterior: payload['estadoAnterior'] as string | undefined,
            estadoNuevo: payload['estadoNuevo'] as string | undefined,
            metadata: payload,
            ocurridoEn: new Date(evento.ocurridoEn),
          });
        } catch (error) {
          // Auditoría no debe interrumpir el flujo principal
          this.logger.error(`Error registrando auditoría para ${tipo}: ${String(error)}`);
        }
      });
    }
  }
}
