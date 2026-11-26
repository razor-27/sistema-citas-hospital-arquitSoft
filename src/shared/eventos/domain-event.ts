export interface DomainEvent<TPayload = unknown> {
  readonly nombre: string;
  readonly ocurridoEn: Date;
  readonly payload: TPayload;
}

export type EventHandler<TPayload = unknown> = (
  event: DomainEvent<TPayload>,
) => Promise<void> | void;

export const EVENT_BUS = 'EVENT_BUS';

export interface EventBusPort {
  publicar<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
  suscribir<TPayload>(nombreEvento: string, handler: EventHandler<TPayload>): void;
}

/**
 * Bus de eventos en memoria para comunicación desacoplada entre módulos del monolito.
 */
export class InMemoryEventBus implements EventBusPort {
  private readonly handlers = new Map<string, EventHandler<unknown>[]>();

  suscribir<TPayload>(nombreEvento: string, handler: EventHandler<TPayload>): void {
    const actuales = this.handlers.get(nombreEvento) ?? [];
    actuales.push(handler as EventHandler<unknown>);
    this.handlers.set(nombreEvento, actuales);
  }

  async publicar<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    const registrados = this.handlers.get(event.nombre) ?? [];
    await Promise.all(registrados.map((handler) => handler(event)));
  }

  /** Alias compatible con consumidores existentes y pruebas de integración. */
  async publish<TPayload>(event: {
    tipo?: string;
    nombre?: string;
    payload: TPayload;
    ocurridoEn: Date | string;
  }): Promise<void> {
    const nombre = event.nombre ?? event.tipo;
    if (!nombre) throw new Error('El evento debe incluir nombre o tipo');

    await this.publicar<TPayload>({
      nombre,
      payload: event.payload,
      ocurridoEn: event.ocurridoEn instanceof Date ? event.ocurridoEn : new Date(event.ocurridoEn),
    });
  }
}
