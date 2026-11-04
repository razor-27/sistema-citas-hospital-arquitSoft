# Enfoque Arquitectónico

Dentro de la aplicación se aplica el enfoque de **Arquitectura Hexagonal (Puertos y Adaptadores)** combinada con **Clean Architecture** para cada módulo funcional (`citas`, `agenda`, `pacientes`, `notificaciones`). 

A continuación se detalla el enfoque tomando como referencia el módulo central de **Reservas y Citas Médicas** (ADR-002, ADR-003, ADR-008).

---

## Diagrama del Enfoque Hexagonal del Módulo de Citas

```mermaid
flowchart TD
    GW["Cliente HTTP / REST Controller: /api/v1/citas/*"]

    subgraph API["CAPA DE ADAPTADORES DE ENTRADA (PRIMARY / DRIVING)"]
        CC["CitaController (REST API)"]
        AdminCitaCtrl["AdmisionCitaController (Ventanilla / Sobrecupos)"]
        EventConsumer["InternalEventListener (Eventos de Dominio)"]
    end

    subgraph APP["CAPA DE APLICACIÓN (CASOS DE USO)"]
        UC1["ReservarCitaUseCase (Orquesta bloqueo y confirmación)"]
        UC2["CancelarCitaUseCase (Libera cupo y notifica)"]
        UC3["ReprogramarCitaUseCase (Transaccional)"]
        UC4["RealizarCheckInUseCase (Valida ventana horaria)"]
    end

    subgraph DOMAIN["CAPA DE DOMINIO (CORE DEL NEGOCIO)"]
        ENT["Entidades: Cita, Turno/Slot, AgendaMedica"]
        VO["Value Objects: RangoHorario, EstadoCita, MotivoCancelacion"]
        SERV["Servicio de Dominio: PoliticaReservaService (Reglas de antelación y cupos)"]
        PORTS["Puertos Salientes (Interfaces):
        - CitaRepositoryPort
        - SlotLockPort (Control concurrencia)
        - EventPublisherPort
        - VerificacionSeguroPort"]
    end

    subgraph INFRA["CAPA DE ADAPTADORES DE SALIDA (SECONDARY / DRIVEN)"]
        DBRepo["PostgresCitaRepositoryAdapter"]
        RedisLock["RedisDistributedLockAdapter (Redlock/TTL 5 min)"]
        EventPub["RabbitMQEventPublisherAdapter / EventEmitter"]
        SISAdapter["SISVerificacionAdapter (Cliente HTTP Resiliente)"]
    end

    subgraph PERSISTENCIA["INFRAESTRUCTURA Y SERVICIOS EXTERNOS"]
        PG[("PostgreSQL: Tabla citas, cupos_agenda, auditoria")]
        REDIS[("Redis: Claves de bloqueo de cupo y caché")]
        BROKER[("Broker de Colas: Cola notificaciones / eventos")]
        EXT_SIS["API Externa SIS / Aseguradoras"]
    end

    GW --> CC
    GW --> AdminCitaCtrl
    CC --> UC1
    CC --> UC2
    CC --> UC3
    CC --> UC4
    AdminCitaCtrl --> UC1
    EventConsumer --> UC2

    UC1 --> SERV
    UC1 --> PORTS
    UC2 --> PORTS
    UC3 --> PORTS
    UC4 --> PORTS
    SERV --> ENT

    PORTS -.->|"Implementado por"| DBRepo
    PORTS -.->|"Implementado por"| RedisLock
    PORTS -.->|"Implementado por"| EventPub
    PORTS -.->|"Implementado por"| SISAdapter

    DBRepo --> PG
    RedisLock --> REDIS
    EventPub --> BROKER
    SISAdapter --> EXT_SIS

    style API fill:#1a2332,stroke:#4a90e2,stroke-width:2px,color:#fff
    style APP fill:#234e52,stroke:#81e6d9,stroke-width:2px,color:#fff
    style DOMAIN fill:#1b365d,stroke:#63b3ed,stroke-width:2px,color:#fff
    style INFRA fill:#2d3748,stroke:#cbd5e0,stroke-width:2px,color:#fff
    style PERSISTENCIA fill:#1a365d,stroke:#3182ce,stroke-width:2px,color:#fff
```

---

## Principios y Reglas del Enfoque

1. **Regla de Dependencia:** Las dependencias apuntan siempre hacia adentro. El **Dominio** no conoce los Controladores, ni PostgreSQL, ni Redis, ni librerías de terceros; solo define interfaces puras (*Puertos*).
2. **Aislamiento de Reglas de Negocio:** Las restricciones críticas de agendamiento (por ejemplo: *"un paciente no puede tener dos citas en la misma especialidad el mismo mes"*, *"un cupo no puede cancelarse con menos de 24 horas de antelación"*, *"el check-in solo es válido entre 45 y 10 minutos antes"*) residen exclusivamente en las entidades y servicios de dominio.
3. **Inversión de Control (IoC):** La capa de Infraestructura implementa los puertos definidos por el Dominio. Por ejemplo, el caso de uso interactúa con `SlotLockPort`; si mañana se migra de Redis a otro mecanismo de locking, la lógica de la reserva no sufre ninguna alteración.
4. **Resiliencia en Adaptadores Salientes:** Los adaptadores que consumen servicios externos (verificación SIS, pasarela de notificaciones) integran *Timeouts* estrictos y *Circuit Breakers* para evitar degradar el hilo de ejecución principal.
5. **Eventos de Dominio:** Cuando una cita es reservada, confirmada o cancelada, el caso de uso emite un evento (`CitaReservadaEvent`, `CitaCanceladaEvent`). Los submódulos de Notificaciones y Auditoría reaccionan a estos eventos sin acoplamiento directo entre el código de citas y el código de mensajería.
