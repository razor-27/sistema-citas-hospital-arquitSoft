# Plan Técnico: Fundación Arquitectónica, Infraestructura y CI/CD

**Rama:** `001-fundacion-arquitectura-y-ci` | **Fecha:** 2026-11-25 | **Spec:** [spec.md](spec.md)

---

## Resumen

Implementar la base técnica del Monolito Modular en **TypeScript + Node.js (NestJS)** con **PostgreSQL 16**, **Redis 7** y **RabbitMQ 3** orquestados vía Docker Compose. Se configura el *Shared Kernel* de errores de dominio, el filtro global de excepciones HTTP, la documentación automática OpenAPI/Swagger, el endpoint `/health`, la suite de pruebas unitarias con cobertura (Jest/Vitest) y el flujo CI/CD en GitHub Actions.

---

## Contexto Técnico

- **Lenguaje / Runtime:** TypeScript 5.x, Node.js 22+ LTS
- **Framework:** NestJS 10+ (`@nestjs/common`, `@nestjs/swagger`, `@nestjs/terminus`, `class-validator`, `class-transformer`)
- **Almacenamiento y Mensajería:** PostgreSQL 16 (driver `pg` / `kysely` o `typeorm`), Redis 7 (`ioredis`), RabbitMQ 3 (`amqplib`)
- **Pruebas y Cobertura:** Jest (o Vitest) + Supertest + reporte `lcov` / `text` / `json-summary`
- **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`)
- **Restricciones:** Aplicación 100% *stateless* (ADR-007); fronteras estrictas entre módulos (ADR-001).

---

## Verificación de Constitución (*Constitution Check*)

| Principio | Cumplimiento | Evidencia en el Plan |
| :--- | :---: | :--- |
| **I. Monolito Modular** | ✅ | Estructura `src/modulos/*` con `index.ts` público y sin imports cruzados internos. |
| **II. Clean Architecture** | ✅ | Separación `dominio/`, `aplicacion/`, `infraestructura/`, `presentacion/` por módulo. |
| **III. SOLID y Patrones** | ✅ | Errores de dominio agnósticos a HTTP en `src/shared/errores/`; mapeo HTTP solo en `presentacion/`. |
| **V. Stateless y Salud** | ✅ | `GET /health` sin estado en memoria; variables en `.env`. |
| **VII. API Documentada** | ✅ | SwaggerModule configurado en `/api/docs`. |
| **VIII. Pruebas y CI/CD** | ✅ | Umbral `coverageThreshold >= 80%` y `.github/workflows/ci.yml`. |

---

## Estructura del Proyecto

```text
citas-hospital-s/
├── .github/
│   └── workflows/
│       └── ci.yml                       # Lint, Build, Unit Tests + Coverage, Upload Artifact
├── docker-compose.yml                   # PostgreSQL 16, Redis 7, RabbitMQ 3
├── .env.example                         # Variables de entorno documentadas
├── package.json
├── tsconfig.json
└── src/
    ├── main.ts                          # Bootstrap NestJS, ValidationPipe, Swagger (/api/docs)
    ├── app.module.ts                    # Módulo raíz que ensambla los módulos funcionales
    ├── shared/
    │   ├── config/
    │   │   └── env.validation.ts        # Validación fail-fast de variables de entorno
    │   ├── errores/
    │   │   ├── regla-negocio.error.ts
    │   │   ├── conflicto-concurrencia.error.ts
    │   │   └── recurso-no-encontrado.error.ts
    │   └── infraestructura/
    │       ├── http-exception.filter.ts # Mapeo Dominio -> HTTP (400/404/409/500)
    │       └── health.controller.ts     # GET /health (PostgreSQL + Redis)
    └── modulos/
        ├── auth/
        ├── pacientes/
        ├── medicos/
        ├── agenda/
        ├── citas/
        ├── notificaciones/
        └── auditoria/
```

---

## Contratos de API (Base)

| Método | Ruta | Descripción | Respuestas |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Estado de salud de API, PostgreSQL y Redis | `200 OK` / `503 Service Unavailable` |
| `GET` | `/api/docs` | Interfaz Swagger UI (OpenAPI 3.0) | `200 OK` |
| `GET` | `/api/docs-json` | Esquema OpenAPI en JSON (importable en Postman) | `200 OK` |

---

## Análisis de Base de Datos y Caché (Base)

- **PostgreSQL:** Pool de conexiones configurado con límite acorde a réplicas *stateless* (`max: 20` por instancia) y `idleTimeoutMillis` para evitar agotamiento en picos.
- **Redis:** Cliente `ioredis` compartido con estrategia de reconexión exponencial y *prefix* por entorno para aislar llaves de caché (`disp:*`) y candados (`lock:slot:*`).
