# Arquitectura Inicial del Sistema de Citas Médicas

## Diagrama de Arquitectura Global

```mermaid
flowchart TD

    subgraph ACTORES["ACTORES"]
        Paciente["Paciente / Familiar"]
        Personal["Personal de Admisión / Ventanilla"]
        Medico["Médico Especialista"]
        AdminSis["Jefatura Médica / Administrador TI"]
    end

    subgraph PRESENTACION["CAPA DE PRESENTACIÓN"]
        Portal["Portal Web Pacientes (React/Next.js)"]
        App["App Móvil Pacientes (Flutter)"]
        AdminUI["Panel Administrativo y Ventanilla"]
        MedicoUI["Tablero de Agenda Médica"]
    end

    subgraph ENTRADA["INGRESO Y BALANCEO"]
        LB["Balanceador de Carga (Nginx / Ingress Controller)"]
        RateLimit["Rate Limiter & WAF (Anti-DDoS / Anti-Bot)"]
    end

    subgraph MONOLITO["MONOLITO MODULAR - SISTEMA DE CITAS (Node.js / TypeScript)"]
        AuthMod["Módulo Autenticación y Seguridad (JWT/RBAC)"]
        AgendaMod["Módulo de Agenda y Oferta Médica"]
        CitasMod["Módulo de Reservas y Check-in (Core)"]
        PacientesMod["Módulo de Pacientes y Aseguramiento"]
        NotifMod["Módulo de Notificaciones y Eventos"]
        AuditMod["Módulo de Auditoría Inmutable"]
    end

    subgraph MENSAJERIA["INFRAESTRUCTURA ASÍNCRONA"]
        Queue["Cola de Mensajería (RabbitMQ / Redis Streams)"]
        Workers["Pool de Workers en Segundo Plano"]
    end

    subgraph DATOS["PERSISTENCIA Y MEMORIA"]
        PostgresMaster[("PostgreSQL Primario (Escrituras / ACID)")]
        PostgresReplica[("PostgreSQL Réplica (Lecturas pesadas / Reportes)")]
        RedisCluster[("Redis Clúster (Caché Disponibilidad + Locks)")]
    end

    subgraph EXTERNOS["SISTEMAS EXTERNOS"]
        RENIEC["RENIEC / Validación Identidad"]
        SIS["SIS / Aseguradoras (Cobertura)"]
        NotifGateways["Pasarela SMS / WhatsApp / Email"]
        HISMINSA["HIS MINSA / SIHCE"]
    end

    ACTORES --> PRESENTACION
    PRESENTACION --> LB
    LB --> RateLimit
    RateLimit --> MONOLITO

    MONOLITO --> RedisCluster
    MONOLITO --> PostgresMaster
    PostgresMaster -.->|"Replicación streaming"| PostgresReplica
    MONOLITO --> Queue
    Queue --> Workers

    Workers --> NotifGateways
    Workers --> HISMINSA
    PacientesMod --> RENIEC
    PacientesMod --> SIS

    style ACTORES fill:#1a2332,stroke:#4a90e2,stroke-width:2px,color:#fff
    style PRESENTACION fill:#1a2332,stroke:#4a90e2,stroke-width:2px,color:#fff
    style ENTRADA fill:#2d3748,stroke:#cbd5e0,stroke-width:2px,color:#fff
    style MONOLITO fill:#1b365d,stroke:#63b3ed,stroke-width:2px,color:#fff
    style MENSAJERIA fill:#2d3748,stroke:#cbd5e0,stroke-width:2px,color:#fff
    style DATOS fill:#1a365d,stroke:#3182ce,stroke-width:2px,color:#fff
    style EXTERNOS fill:#2d3748,stroke:#cbd5e0,stroke-width:2px,color:#fff
```

## Descripción de las Capas

- **Capa de Presentación:** Múltiples clientes diseñados para sus respectivos perfiles:
  - *Portal Web y App Móvil:* Enfocados en la experiencia ágil del paciente para búsqueda rápida, agendamiento con pocos clics, recordatorios y check-in virtual.
  - *Panel Administrativo de Ventanilla:* Optimizado para velocidad de tipeo, búsqueda rápida de DNI y gestión de sobrecupos autorizados.
  - *Tablero del Médico:* Vista calendarizada y lista de pacientes en sala de espera en tiempo real.
- **Capa de Entrada y Balanceo:** 
  - Balanceador de carga Nginx / Ingress Controller distribuyendo el tráfico HTTP entre múltiples instancias réplica sin estado del servidor de aplicación.
  - Mecanismo de *Rate Limiting* para mitigar abusos, bots o scraping masivo durante la apertura de cupos médicos.
- **Capa de Lógica de Negocio (Monolito Modular):** 
  - Una sola aplicación estructurada internamente en módulos funcionales aislados mediante Arquitectura Hexagonal.
  - No existen llamadas de red HTTP entre los módulos; la comunicación interna ocurre mediante llamadas directas en memoria o despacho de eventos de dominio (`Domain Events`), eliminando latencias innecesarias.
- **Capa de Persistencia y Memoria:**
  - *Redis Clúster:* Almacena el catálogo de disponibilidad horaria (lecturas ultra rápidas < 15 ms) y orquesta los bloqueos distribuidos temporales de cupo (*slot locking*) para evitar doble reserva.
  - *PostgreSQL Primario:* Garantiza consistencia transaccional ACID estricta para la confirmación de citas y control de auditoría.
  - *PostgreSQL Réplica:* Atiende consultas de reportería estadística, métricas de inasistencia (*no-show*) y exportación sin degradar el rendimiento transaccional.
- **Capa de Mensajería Asíncrona (Workers):**
  - Desacopla las operaciones lentas o susceptibles a fallos de terceros (envíos de mensajes por WhatsApp/SMS, generación de PDFs de comprobante, sincronizaciones periódicas con el HIS MINSA).
- **Integraciones Externas:** Servicios de acreditación de identidad (RENIEC), verificación de aseguramiento (SIS) y plataformas de comunicación multicanal.
