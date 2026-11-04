# Diseño Interno de Módulos

> **Proyecto:** Sistema de Citas Médicas Escalable · Hospital de Huamanga  
> **Módulo de Referencia:** Módulo Central de Citas y Reservas (`src/modulos/citas/`)  
> **Enfoque:** Arquitectura Hexagonal y Clean Architecture con Inversión de Dependencias (ADR-001, ADR-002, ADR-008)  
> **Nivel C4:** 4 – Código

---

## 1. Propósito

Establecer la estructura interna y la organización del código fuente del sistema de citas médicas. Sus objetivos principales son:
- Mantener los límites de dominio bien delimitados dentro del monolito modular.
- Aislar las reglas de reserva médica (antelación, restricciones de cupo, políticas de cancelación y control de concurrencia) de los frameworks, bases de datos y librerías externas.
- Garantizar que cualquier desarrollador sepa con exactitud en qué capa ubicar cada clase, interfaz o adaptador.

---

## 2. Estructura de Carpetas del Sistema

```text
citas-hospital/
└── src/
    ├── modulos/
    │   ├── citas/                                   # Módulo Núcleo de Citas Médicas
    │   │   ├── dominio/
    │   │   │   ├── entidades/
    │   │   │   │   ├── cita.entity.ts               # Entidad Cita y reglas de estado
    │   │   │   │   └── turno-slot.entity.ts         # Entidad Cupo/Slot horario
    │   │   │   ├── value-objects/
    │   │   │   │   ├── estado-cita.vo.ts            # Enum: RESERVADA, CONFIRMADA, EN_SALA, ATENDIDA, CANCELADA
    │   │   │   │   ├── horario-consulta.vo.ts       # Rango hora inicio / hora fin
    │   │   │   │   └── codigo-reserva.vo.ts         # Identificador único alfanumérico
    │   │   │   ├── servicios/
    │   │   │   │   └── politica-reserva.service.ts  # Reglas de negocio puras (límites, antelación)
    │   │   │   ├── eventos/
    │   │   │   │   ├── cita-reservada.event.ts      # Evento de dominio emitido tras reservar
    │   │   │   │   └── cita-cancelada.event.ts      # Evento emitido al cancelar
    │   │   │   └── puertos/
    │   │   │       ├── cita-repository.port.ts      # Puerto para persistencia de citas
    │   │   │       ├── turno-slot.port.ts           # Puerto para consulta/bloqueo de slots
    │   │   │       ├── distributed-lock.port.ts     # Puerto de candado distribuido (anti-doble reserva)
    │   │   │       └── event-publisher.port.ts      # Puerto para despacho de eventos
    │   │   ├── aplicacion/
    │   │   │   ├── casos-uso/
    │   │   │   │   ├── reservar-cita.use-case.ts    # Caso de uso: orquestación de reserva atómica
    │   │   │   │   ├── cancelar-cita.use-case.ts    # Caso de uso: cancelación y liberación de cupo
    │   │   │   │   ├── reprogramar-cita.use-case.ts # Caso de uso: cambio de horario
    │   │   │   │   └── check-in-cita.use-case.ts    # Caso de uso: confirmación de presencia en sala
    │   │   │   └── dtos/
    │   │   │       ├── reservar-cita.dto.ts         # Parámetros validados de entrada
    │   │   │       └── cita-response.dto.ts         # Objeto de respuesta transferible
    │   │   ├── infraestructura/
    │   │   │   ├── adaptadores/
    │   │   │   │   ├── postgres-cita.repository.ts  # Persistencia con PostgreSQL
    │   │   │   │   ├── redis-distributed-lock.ts    # Adaptador de Lock distribuido con Redis
    │   │   │   │   └── event-emitter.adapter.ts     # Adaptador de publicación de eventos
    │   │   │   └── mappers/
    │   │   │       └── cita.mapper.ts               # Mapeador: Entidad Dominio ⇄ Modelo DB
    │   │   ├── presentacion/
    │   │   │   ├── cita.controller.ts               # Controlador HTTP REST para pacientes
    │   │   │   └── ventanilla-cita.controller.ts    # Controlador especializado para admisión
    │   │   └── citas.module.ts                      # Ensamblado del contenedor IoC del módulo
    │   │
    │   ├── agenda/                                  # Módulo de Programación Médica y Oferta
    │   ├── pacientes/                               # Módulo de Datos de Pacientes y Seguro SIS
    │   ├── notificaciones/                          # Módulo Asíncrono de SMS, WhatsApp y Email
    │   └── auditoria/                               # Módulo de Auditoría Inmutable
    │
    ├── shared/                                      # Código compartido transverso
    │   ├── domain/                                  # Tipos base (Result, Entity, ValueObject)
    │   ├── infra/                                   # Conexiones Postgres, Redis, RabbitMQ
    │   └── utils/                                   # Manejo de fechas sanitarias y loggers
    └── main.ts                                      # Punto de entrada de la aplicación
```

---

## 3. Matriz de Responsabilidades por Capa

| Capa | Componente | Responsabilidad | Depende de |
| :--- | :--- | :--- | :--- |
| **Dominio** | `Cita`, `TurnoSlot` | Mantiene el estado consistente, valida transiciones de estado válidas y encapsula reglas clínicas. | Ninguna capa externa (código TypeScript puro). |
| **Dominio** | `PoliticaReservaService` | Evalúa reglas de negocio complejas (ej. máximo de citas activas por paciente en el mismo mes). | Entidades y Value Objects de dominio. |
| **Dominio** | Puertos (`*Port`) | Declaran los contratos que la lógica de negocio necesita del mundo exterior (BD, Lock, Eventos). | Entidades y eventos del dominio. |
| **Aplicación** | `ReservarCitaUseCase` | Orquesta la transacción: adquiere candado en Redis, valida reglas, reserva en BD y dispara evento. | Solo la capa de Dominio (Entidades y Puertos). |
| **Infraestructura** | `PostgresCitaRepository` | Ejecuta las consultas SQL / ORM con aislamiento transaccional y persistencia en PostgreSQL. | Dominio (`CitaRepositoryPort`) y cliente BD. |
| **Infraestructura** | `RedisDistributedLock` | Implementa el candado distribuido con TTL de 5 min para evitar contención de slots. | Dominio (`DistributedLockPort`) e IORedis. |
| **Presentación** | `CitaController` | Recibe la petición HTTP, valida el DTO de entrada, invoca el caso de uso y retorna el código HTTP. | Capa de Aplicación (Casos de Uso y DTOs). |

---

## 4. Ejemplo de Implementación del Núcleo de Reserva

### Caso de Uso: `ReservarCitaUseCase` (Capa de Aplicación)

```typescript
// src/modulos/citas/aplicacion/casos-uso/reservar-cita.use-case.ts
export class ReservarCitaUseCase {
  constructor(
    private readonly citaRepo: CitaRepositoryPort,
    private readonly turnoRepo: TurnoSlotPort,
    private readonly lockService: DistributedLockPort,
    private readonly politicaService: PoliticaReservaService,
    private readonly eventPublisher: EventPublisherPort
  ) {}

  async ejecutar(command: ReservarCitaDTO): Promise<CitaResponseDTO> {
    const lockKey = `lock:slot:${command.slotId}`;
    
    // 1. Adquisición de candado distribuido temporal (TTL 10s para procesar la transacción)
    const lockAdquirido = await this.lockService.adquirirLock(lockKey, 10000);
    if (!lockAdquirido) {
      throw new ConflictoReservaException("El horario seleccionado está siendo reservado por otro usuario.");
    }

    try {
      // 2. Verificar existencia y estado del cupo/slot
      const slot = await this.turnoRepo.obtenerPorIdConBloqueo(command.slotId);
      if (!slot.estaDisponible()) {
        throw new SlotNoDisponibleException("El cupo ya no se encuentra libre.");
      }

      // 3. Validar políticas de reserva del hospital
      await this.politicaService.validarElegibilidadPaciente(command.pacienteId, slot.especialidadId);

      // 4. Crear entidad de Cita (reglas de dominio)
      const nuevaCita = Cita.crear({
        pacienteId: command.pacienteId,
        slotId: slot.id,
        medicoId: slot.medicoId,
        especialidadId: slot.especialidadId,
        fechaHoraInicio: slot.fechaHoraInicio,
        tipoAtencion: command.tipoAtencion
      });

      // 5. Persistencia atómica
      slot.marcarComoReservado();
      await this.turnoRepo.actualizar(slot);
      const citaGuardada = await this.citaRepo.guardar(nuevaCita);

      // 6. Publicación asíncrona de evento de dominio
      await this.eventPublisher.publicar(new CitaReservadaEvent(citaGuardada));

      return CitaMapper.toDTO(citaGuardada);
    } finally {
      // 7. Liberar el candado
      await this.lockService.liberarLock(lockKey);
    }
  }
}
```
