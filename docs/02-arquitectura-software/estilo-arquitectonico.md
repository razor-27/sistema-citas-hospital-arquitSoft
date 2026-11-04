# Estilo Arquitectónico

El sistema adopta el estilo de **Monolito Modular con Despliegue Horizontal sin Estado (Stateless)**, complementado con **Caché en Memoria Distribuido** y **Mensajería Asíncrona basada en Eventos**. Esta decisión responde directamente a los drivers ADR-001, ADR-003, ADR-004, ADR-005 y ADR-007.

---

## Diagrama de Topología de Despliegue

```mermaid
flowchart TD
    Clientes["Clientes (Portal Web, App Móvil, Ventanilla, Consultorio)"]
    DNS["DNS / Cloudflare (Protección DDoS / WAF)"]
    LB["Balanceador de Carga Nginx / Traefik / ALB (Round Robin con Health-Checks)"]

    subgraph CLUSTER["Clúster de Aplicación (Contenedores Docker / K8s / ECS)"]
        App1["Instancia Monolito 1 (Modular Core)"]
        App2["Instancia Monolito 2 (Modular Core)"]
        AppN["Instancia Monolito N (Autoescalado HPA 2 a 6 réplicas)"]
    end

    subgraph CACHE["Capa de Memoria y Sincronización"]
        RedisPrimario["Redis Primario: Distributed Locks + Caché de Disponibilidad"]
        RedisReplica["Redis Réplica: Lecturas rápidas de disponibilidad"]
    end

    subgraph ASYNC["Plataforma Asíncrona"]
        QueueBroker["Broker de Mensajería: RabbitMQ / Redis Streams"]
        WorkerPool["Workers de Notificaciones y Sincronización"]
    end

    subgraph PERSISTENCIA["Capa de Persistencia Relacional"]
        PGPrimary[("PostgreSQL Primario: Transacciones ACID de Citas")]
        PGStandby[("PostgreSQL Réplica Streaming: Failover automático < 30s")]
        Backups["Backups automatizados continuos (WAL archiving + snapshots)"]
    end

    subgraph EXTERNAL["Servicios de Terceros"]
        SMS["Pasarela WhatsApp / SMS (Twilio/Meta)"]
        SISGov["Servicio de Cobertura SIS / RENIEC"]
    end

    Clientes --> DNS
    DNS --> LB
    LB --> App1
    LB --> App2
    LB --> AppN

    App1 & App2 & AppN <--> RedisPrimario
    App1 & App2 & AppN --> PGPrimary
    App1 & App2 & AppN --> QueueBroker

    RedisPrimario -.->|"Replicación en memoria"| RedisReplica
    PGPrimary -.->|"Replicación streaming síncrona"| PGStandby
    PGPrimary -.-> Backups

    QueueBroker --> WorkerPool
    WorkerPool --> SMS
    WorkerPool --> SISGov

    style Clientes fill:#2d3748,stroke:#cbd5e0,color:#fff
    style CLUSTER fill:#1b365d,stroke:#63b3ed,stroke-width:2px,color:#fff
    style CACHE fill:#742a2a,stroke:#feb2b2,stroke-width:2px,color:#fff
    style ASYNC fill:#234e52,stroke:#81e6d9,stroke-width:2px,color:#fff
    style PERSISTENCIA fill:#1a365d,stroke:#3182ce,stroke-width:2px,color:#fff
    style EXTERNAL fill:#4a5568,stroke:#cbd5e0,color:#fff
```

---

## Metas de Disponibilidad y Recuperación

| Escenario de Falla | Estrategia de Mitigación | RTO (Tiempo de Recuperación) | RPO (Pérdida Máxima de Datos) |
| :--- | :--- | :--- | :--- |
| **Caída de una instancia de aplicación** | El balanceador detecta el fallo mediante `GET /health` y drena el tráfico a las réplicas restantes. El orquestador recrea el contenedor en segundos. | **< 3 segundos** | **0** (la aplicación es totalmente *stateless*) |
| **Pico masivo de solicitudes (Apertura 7:00 a. m.)** | Autoescalado horizontal de pods/contenedores disparado por uso de CPU > 70% o tasa de peticiones concurrentes. Redis atiende lecturas. | **Automático (< 60 s)** | **0** |
| **Falla del nodo primario de PostgreSQL** | Activación y promoción automática de la réplica en standby mediante Patroni / AWS Aurora Failover. | **< 30 segundos** | **≈ 0** (Replicación streaming síncrona en red local) |
| **Caída temporal de pasarela WhatsApp/SMS** | Los mensajes quedan retenidos en la cola de mensajería (RabbitMQ / Redis Streams) y se reintentan progresivamente sin afectar la reserva de la cita. | **Inmediato (Aislado)** | **0** (Mensajería persistente con DLQ) |

---

## Justificación del Estilo

1. **Alineación con el Alcance Específico:** Al estar delimitado el sistema al módulo de citas médicas, un enfoque de microservicios añadiría capas de red artificiales. El monolito modular ejecuta las validaciones y reglas entre submódulos en **nanosegundos en memoria**, maximizando la velocidad.
2. **Control Estricto de Concurrencia:** La reserva de un cupo médico exige exclusión mutua para evitar sobreventa. Gestionar esto en una base de datos relacional con bloqueo optimista/pesimista y locks de Redis es simple, auditable y robusto en un monolito modular, mientras que en microservicios exigiría complejas sagas de compensación distribuida.
3. **Escalabilidad Elástica a Bajo Costo:** Dado que el monolito es *stateless*, escalar de 2 a 10 réplicas durante los 30 minutos de apertura de agenda es sumamente económico y sencillo de orquestar.
4. **Desacoplamiento Preparado para el Futuro:** Si en etapas posteriores el hospital decide incorporar otros módulos de gran envergadura (como Triaje o Historia Clínica Completa), los límites hexagonales del módulo de citas permitirán exponerlo externamente como un microservicio independiente sin reescribir su lógica interna.
