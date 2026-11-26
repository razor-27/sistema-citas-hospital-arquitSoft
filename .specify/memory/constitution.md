# Constitución del Proyecto: Sistema Escalable de Citas Médicas (Hospital de Huamanga)

> **Versión:** 1.0.0 | **Fecha:** 2026-11-25 | **Estado:** Activo  
> **Referencia Base:** [README.md](../../README.md) · [ADRs](../../docs/01-analisis-de-sistema/07-decisiones-arquitectonicas.md)

---

## Preámbulo

Esta Constitución establece los principios de ingeniería, restricciones arquitectónicas, estándares de calidad y compuertas de verificación **no negociables** para el desarrollo del Sistema de Citas Médicas del Hospital de Huamanga. Toda especificación (`spec.md`), plan técnico (`plan.md`), lista de tareas (`tasks.md`) e implementación de código **DEBE** cumplir estrictamente con estas reglas.

---

## Principios Fundamentales

### Principio I: Monolito Modular con Fronteras Estrictas (ADR-001)
- El backend **DEBE** construirse como un **Monolito Modular** en un único repositorio y proceso desplegable *stateless*.
- Los módulos funcionales (`auth`, `pacientes`, `medicos`, `agenda`, `citas`, `notificaciones`, `auditoria`) **DEBEN** comunicarse entre sí únicamente a través de su API pública (`index.ts`) o mediante eventos de dominio.
- Un módulo **NO DEBE** importar archivos internos (`dominio/`, `infraestructura/`) de otro módulo ni leer/escribir directamente en las tablas de base de datos pertenecientes a otro módulo.

### Principio II: Clean Architecture y Arquitectura Hexagonal por Módulo (ADR-002)
- Cada módulo **DEBE** estructurarse en cuatro capas internas: `dominio/`, `aplicacion/`, `infraestructura/` y `presentacion/`, más `*.module.ts` (composición IoC) e `index.ts`.
- **Regla de Dependencia:** Las dependencias de código fuente **DEBEN** apuntar exclusivamente hacia el centro (`dominio/`).
- La capa `dominio/` **NO DEBE** importar frameworks web (NestJS/Express), ORMs/query builders (TypeORM/Kysely/Prisma), clientes de Redis, brokers AMQP ni SDKs externos. Toda dependencia externa se abstrae mediante **Puertos (interfaces)** en `dominio/` e implementaciones en `infraestructura/`.

### Principio III: Principios SOLID y Patrones de Diseño Estándar
- Todo código de negocio **DEBE** respetar los 5 principios SOLID, con énfasis en **SRP** (casos de uso de propósito único), **OCP** (extensibilidad vía decoradores y adaptadores) e **ISP/DIP** (puertos granulares inyectados por constructor).
- Se **DEBEN** aplicar los patrones definidos en la arquitectura:
  - **Repository** para persistencia en PostgreSQL.
  - **Distributed Lock (`SET NX PX`)** para exclusión mutua de cupos.
  - **Decorator** para caché de disponibilidad en Redis.
  - **Adapter** para integraciones externas (RENIEC, SIS, WhatsApp/SMS, HIS MINSA).
  - **Domain Events (Pub/Sub)** para desacoplar notificaciones y auditoría.
  - **Circuit Breaker + DLQ** para tolerancia a fallos de pasarelas externas (ADR-010).

### Principio IV: Cero Doble Reserva (*Zero Double-Booking*) e Integridad Transaccional (ADR-003, ADR-006, EQ-04)
- Ningún cupo médico (`TurnoSlot`) **PUEDE** ser asignado a dos citas activas simultáneamente bajo ninguna condición de concurrencia.
- Toda reserva atómica **DEBE** combinar:
  1. Candado distribuido en Redis (`SET lock:slot:{slotId} {token} NX PX {ttl}`).
  2. Transacción ACID en PostgreSQL con bloqueo pesimista (`SELECT ... FOR UPDATE`) y restricción única parcial en base de datos sobre cupos activos.
- Ante contención simultánea, el sistema **DEBE** responder `HTTP 409 Conflict` en menos de 200 ms al usuario concurrente.

### Principio V: Estrategia de Caché y Rendimiento en Picos (ADR-004, EQ-02, EQ-03)
- Las consultas de disponibilidad horaria **DEBEN** pasar por una capa de caché en Redis (`CachedDisponibilidadDecorator`) con TTL corto configurable (60 s por defecto) e **invalidación inmediata por eventos** al reservar, cancelar, reprogramar o bloquear cupos.
- El sistema **DEBE** permanecer *stateless* (sesiones en JWT/Redis) para escalar horizontalmente detrás de un balanceador de carga con endpoint `GET /health`.

### Principio VI: Seguridad por Diseño, Privacidad y Estándares (ADR-008, ADR-009, EQ-05)
- Todo endpoint protegido **DEBE** validar autenticación JWT y autorización granular por rol (**RBAC**: `PACIENTE`, `ADMISION`, `MEDICO`, `ADMIN`).
- Se **DEBE** prevenir IDOR verificando que un paciente solo acceda a sus propias citas.
- Toda operación de creación, modificación, cancelación y check-in **DEBE** registrarse en una tabla de auditoría inmutable (*append-only*) con `userId`, `ip`, `timestamp`, `estadoAnterior` y `estadoPosterior` (cumplimiento Ley N.° 29733).
- El modelado de entidades clínicas (`AgendaMedica`, `TurnoSlot`, `Cita`) **DEBE** mantener compatibilidad semántica con **HL7 FHIR** (`Schedule`, `Slot`, `Appointment`).

### Principio VII: API REST Documentada y Contratos Explícitos
- Todos los endpoints REST bajo `/api/v1/...` **DEBEN** validar DTOs de entrada estrictamente y estar documentados con **OpenAPI 3.0 / Swagger** accesible en `/api/docs`.

### Principio VIII: Pruebas Automatizadas, Cobertura, CI/CD y Escenarios de Calidad
- Toda regla de negocio y caso de uso en `dominio/` y `aplicacion/` **DEBE** contar con pruebas unitarias automatizadas (sin requerir BD ni Redis reales) alcanzando una **cobertura mínima del 80%** en líneas y ramas del núcleo de negocio.
- Todo cambio **DEBE** validarse automáticamente en un pipeline **CI/CD en GitHub Actions** (lint, build, pruebas unitarias con reporte de cobertura, y pruebas de integración/contrato).
- Los escenarios de atributos de calidad (**EQ-01** a **EQ-06**) **DEBEN** contar con suites ejecutables de verificación funcional/contrato (**Postman / Newman**) y de carga/concurrencia (**k6**).

---

## Stack Tecnológico Autorizado

| Capa / Rol | Tecnología |
| :--- | :--- |
| **Lenguaje y Runtime** | TypeScript 5.x sobre Node.js (LTS) |
| **Framework Backend** | NestJS (o Express estructurado con IoC explícito) + Swagger/OpenAPI |
| **Base de Datos Relacional** | PostgreSQL 16+ (ACID, `SELECT ... FOR UPDATE`, índices compuestos) |
| **Caché y Locks Distribuidos** | Redis 7+ (`SET NX PX`, TTL, invalidación por eventos) |
| **Mensajería Asíncrona** | RabbitMQ (AMQP + Dead Letter Queue) |
| **Resiliencia Externa** | Opossum (Circuit Breaker) |
| **Pruebas Unitarias e Integración** | Jest o Vitest + Supertest + reporte de cobertura (lcov/html) |
| **Pruebas de Calidad y Carga** | Postman / Newman (contratos y RBAC) + k6 (rendimiento, spike 5,000 VUs, concurrencia) |
| **CI/CD y Contenedores** | Docker / Docker Compose + GitHub Actions |

---

## Gobernanza

1. Cualquier excepción a esta Constitución requiere un nuevo **ADR** documentado en `docs/01-analisis-de-sistema/07-decisiones-arquitectonicas.md`.
2. Durante la fase `/speckit.plan`, cada `plan.md` **DEBE** incluir una sección **Constitution Check** verificando el cumplimiento de los Principios I–VIII antes de generar `tasks.md`.
