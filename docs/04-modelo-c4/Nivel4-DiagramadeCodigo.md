# Nivel 4 · Diagrama de Código

> **Proyecto:** Sistema de Citas Médicas Escalable · Hospital de Huamanga  
> **Modelo:** C4 · Nivel 4 de 4 · **Notación:** Diagrama de Clases UML  
> **Flujo Detallado:** Reservar Cita Médica con Control de Concurrencia y Bloqueo Distribuido

---

## 1. Objetivo

Mostrar la **organización detallada del código orientado a objetos**: clases, interfaces, métodos y cómo colaboran en el flujo de mayor criticidad del sistema: **Reservar Cita Médica**. Este flujo garantiza la atomicidad y la prevención absoluta de doble agendamiento (*race conditions*) bajo alta concurrencia.

| Aspecto | Descripción |
| :--- | :--- |
| **Pregunta que responde** | ¿Cuáles son las clases, métodos y relaciones exactas que ejecutan la reserva de citas? |
| **Audiencia** | Desarrolladores de software y evaluadores técnicos |
| **Nivel anterior** | [`Nivel3-DiagramadeComponentes.md`](Nivel3-DiagramadeComponentes.md) |
| **Detalle de implementación** | [`diseño-interno-de-modulos.md`](../03-diseño-de-software/diseño-interno/diseño-interno-de-modulos.md) |

---

## 2. Diagrama de Clases (UML)

```mermaid
classDiagram
    direction LR

    class CitaController {
        +reservar(req: Request, res: Response): Promise~Response~
    }

    class ReservarCitaUseCase {
        -citaRepo: CitaRepositoryPort
        -turnoRepo: TurnoSlotPort
        -lockService: DistributedLockPort
        -politicaService: PoliticaReservaService
        -eventPublisher: EventPublisherPort
        +ejecutar(cmd: ReservarCitaDTO): Promise~CitaResponseDTO~
    }

    class PoliticaReservaService {
        +validarElegibilidadPaciente(pacienteId, especialidadId): Promise~void~
        +validarAntelacionMinima(fechaHora): boolean
    }

    class Cita {
        +id: string
        +codigoReserva: CodigoReserva
        +pacienteId: string
        +slotId: string
        +medicoId: string
        +especialidadId: string
        +fechaHora: Date
        -estado: EstadoCita
        +crear(props): Cita$
        +confirmar(): void
        +cancelar(motivo: string): void
        +realizarCheckIn(): void
    }

    class TurnoSlot {
        +id: string
        +medicoId: string
        +consultorioId: string
        +horario: HorarioConsulta
        -estadoSlot: EstadoSlot
        +estaDisponible(): boolean
        +marcarComoReservado(): void
        +liberar(): void
    }

    class EstadoCita {
        <<enumeration>>
        RESERVADA
        CONFIRMADA
        EN_SALA
        ATENDIDA
        CANCELADA
        NO_ASISTIO
    }

    class EstadoSlot {
        <<enumeration>>
        DISPONIBLE
        BLOQUEADO_TEMPORAL
        RESERVADO
        INACTIVO
    }

    class CitaRepositoryPort {
        <<interface>>
        +guardar(cita: Cita): Promise~Cita~
        +buscarPorId(id: string): Promise~Cita~
        +buscarPorCodigo(codigo: string): Promise~Cita~
    }

    class TurnoSlotPort {
        <<interface>>
        +obtenerPorIdConBloqueo(id: string): Promise~TurnoSlot~
        +actualizar(slot: TurnoSlot): Promise~void~
    }

    class DistributedLockPort {
        <<interface>>
        +adquirirLock(recurso: string, ttlMs: number): Promise~boolean~
        +liberarLock(recurso: string): Promise~void~
    }

    class EventPublisherPort {
        <<interface>>
        +publicar(evento: DomainEvent): Promise~void~
    }

    class PostgresCitaRepository
    class PostgresTurnoSlotRepository
    class RedisDistributedLockAdapter
    class RabbitMQEventPublisherAdapter

    CitaController ..> ReservarCitaUseCase : invoca
    ReservarCitaUseCase --> CitaRepositoryPort
    ReservarCitaUseCase --> TurnoSlotPort
    ReservarCitaUseCase --> DistributedLockPort
    ReservarCitaUseCase --> EventPublisherPort
    ReservarCitaUseCase --> PoliticaReservaService
    ReservarCitaUseCase ..> Cita : crea
    ReservarCitaUseCase ..> TurnoSlot : modifica

    Cita --> EstadoCita
    TurnoSlot --> EstadoSlot

    PostgresCitaRepository ..|> CitaRepositoryPort
    PostgresTurnoSlotRepository ..|> TurnoSlotPort
    RedisDistributedLockAdapter ..|> DistributedLockPort
    RabbitMQEventPublisherAdapter ..|> EventPublisherPort
```

---

## 3. Catálogo de Clases e Interfaces

| Elemento | Capa | Tipo | Responsabilidad |
| :--- | :--- | :--- | :--- |
| `CitaController` | Presentación | Clase | Maneja la petición HTTP `POST /api/v1/citas`, valida el esquema del cuerpo con DTOs y retorna `201 Created` o `409 Conflict`. |
| `ReservarCitaUseCase` | Aplicación | Clase | Orquesta de manera secuencial y segura el flujo de reserva (adquisición del lock, validaciones de dominio, persistencia transaccional y publicación de evento). |
| `PoliticaReservaService` | Dominio | Servicio de Dominio | Encapsula reglas de negocio complejas del hospital (máximo de citas activas por paciente en el mes, restricciones de cruce de horario). |
| `Cita` | Dominio | Entidad Raíz de Agregado | Protege los invariantes del ciclo de vida de la cita, asigna el código único y gestiona las transiciones válidas de estado. |
| `TurnoSlot` | Dominio | Entidad | Representa el cupo físico/temporal en un consultorio específico con un médico; garantiza que no se reserve si no está disponible. |
| `EstadoCita` | Dominio | Enumeración | Define los estados posibles: `RESERVADA`, `CONFIRMADA`, `EN_SALA`, `ATENDIDA`, `CANCELADA`, `NO_ASISTIO`. |
| `CitaRepositoryPort` | Dominio | Interfaz | Contrato abstracto para guardar y consultar citas sin acoplarse al driver de base de datos. |
| `TurnoSlotPort` | Dominio | Interfaz | Contrato para la lectura y actualización de cupos con soporte de bloqueo pesimista en SQL (`SELECT FOR UPDATE`). |
| `DistributedLockPort` | Dominio | Interfaz | Contrato de candado distribuido para sincronización concurrente entre múltiples instancias de backend. |
| `EventPublisherPort` | Dominio | Interfaz | Contrato para publicar eventos de dominio (`CitaReservadaEvent`). |
| `PostgresCitaRepository` | Infraestructura | Adaptador | Implementa `CitaRepositoryPort` utilizando transacciones ACID en PostgreSQL. |
| `RedisDistributedLockAdapter` | Infraestructura | Adaptador | Implementa `DistributedLockPort` ejecutando primitivas atómicas en Redis (`SET NX PX`). |
| `RabbitMQEventPublisherAdapter`| Infraestructura | Adaptador | Implementa `EventPublisherPort` publicando el evento al broker de mensajería para el envío de notificaciones. |

---

## 4. Diagrama de Secuencia del Flujo de Reserva

```mermaid
sequenceDiagram
    autonumber
    actor P as Paciente / Cliente Web
    participant C as CitaController
    participant UC as ReservarCitaUseCase
    participant Lock as RedisDistributedLockAdapter
    participant TurnoRepo as PostgresTurnoSlotRepository
    participant Pol as PoliticaReservaService
    participant CitaRepo as PostgresCitaRepository
    participant Bus as RabbitMQEventPublisherAdapter

    P->>C: POST /api/v1/citas (slotId, pacienteId, especialidadId)
    C->>UC: ejecutar(ReservarCitaDTO)
    
    rect rgb(240, 248, 255)
        note over UC,Lock: 1. Control de Concurrencia (Mutex)
        UC->>Lock: adquirirLock("lock:slot:4580", 10000ms)
        alt Candado ya tomado por otro usuario
            Lock-->>UC: false
            UC-->>C: ConflictoReservaException
            C-->>P: HTTP 409 Conflict ("Cupo en proceso por otro usuario")
        else Candado adquirido exitosamente
            Lock-->>UC: true
        end
    end

    rect rgb(255, 250, 240)
        note over UC,TurnoRepo: 2. Verificación de Cupo y Políticas
        UC->>TurnoRepo: obtenerPorIdConBloqueo(slotId)
        TurnoRepo-->>UC: TurnoSlot (DISPONIBLE)
        UC->>Pol: validarElegibilidadPaciente(pacienteId, especialidadId)
        Pol-->>UC: OK (Sin cruces ni límites excedidos)
    end

    rect rgb(240, 255, 240)
        note over UC,CitaRepo: 3. Transacción ACID de Persistencia
        UC->>TurnoSlot: marcarComoReservado()
        UC->>TurnoRepo: actualizar(TurnoSlot)
        UC->>Cita: crear(props)
        UC->>CitaRepo: guardar(nuevaCita)
        CitaRepo-->>UC: Cita guardada (ID: cita-9981)
    end

    rect rgb(255, 245, 245)
        note over UC,Bus: 4. Despacho Asíncrono y Liberación
        UC->>Bus: publicar(CitaReservadaEvent)
        UC->>Lock: liberarLock("lock:slot:4580")
    end

    UC-->>C: CitaResponseDTO
    C-->>P: HTTP 201 Created (Comprobante y Código de Reserva)
```

---

## 5. Reglas de Implementación en Código

1. **Aislamiento Absoluto de Dominio:** Ninguna clase dentro de `dominio/` puede importar librerías de infraestructura como TypeORM, Prisma, Redis o Express.
2. **Atomicidad:** La actualización del `TurnoSlot` y el guardado de la `Cita` se ejecutan dentro del mismo bloque de transacción de base de datos. Si una falla, se hace rollback automático de ambas.
3. **Liberación Garantizada del Candado:** La llamada a `liberarLock` reside dentro de un bloque `finally`, garantizando que el cupo nunca quede bloqueado indefinidamente aun si ocurre una excepción imprevista.
