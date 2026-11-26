# Plan Técnico: Consulta de Disponibilidad y Oferta Médica

**Rama:** `002-consulta-disponibilidad-agenda` | **Fecha:** 2026-11-25 | **Spec:** [spec.md](spec.md)

---

## Resumen

Implementar los módulos `medicos` y `agenda` siguiendo Clean Architecture y Monolito Modular. Se diseña el esquema relacional en PostgreSQL con índices compuestos para búsquedas por especialidad/fecha/estado, y se aplica el patrón **Decorator** (`CachedDisponibilidadDecorator`) con Redis (`TTL 60 s`) e invalidación reactiva mediante `EventEmitter2` cuando cambian reservas o bloqueos.

---

## Contexto Técnico

- **Módulos:** `src/modulos/medicos/`, `src/modulos/agenda/`
- **Persistencia:** PostgreSQL 16 (tablas propias por módulo: `medicos`, `especialidades`, `consultorios`, `agendas_medicas`, `turnos_slots`)
- **Caché:** Redis 7 (`ioredis`) con patrón Cache-Aside + Decorator + *Graceful Fallback*
- **Estándares:** HL7 FHIR `Schedule` / `Slot`

---

## Verificación de Constitución (*Constitution Check*)

| Principio | Cumplimiento | Evidencia en el Plan |
| :--- | :---: | :--- |
| **I. Monolito Modular** | ✅ | `agenda` consulta catálogo de `medicos` únicamente vía `medicos/index.ts`. |
| **II. Clean Architecture** | ✅ | `DisponibilidadPort` en `dominio/`; `PostgresDisponibilidadRepo` y `CachedDisponibilidadDecorator` en `infraestructura/`. |
| **III. SOLID (LSP, OCP, DIP)** | ✅ | `CachedDisponibilidadDecorator` y `PostgresDisponibilidadRepo` son intercambiables vía `DisponibilidadPort` (LSP). |
| **V. Estrategia de Caché** | ✅ | Cache-Aside con TTL 60 s + invalidación por eventos `CitaReservadaEvent`, `CitaCanceladaEvent`, `AgendaBloqueadaEvent`. |
| **VII. API Documentada** | ✅ | Decoradores `@ApiTags`, `@ApiOperation`, `@ApiResponse` en controladores. |

---

## Análisis de Base de Datos y Estrategia de Caché

### 1. Modelo de Datos PostgreSQL
- `especialidades (id, codigo, nombre, max_sobrecupos_dia, activo)`
- `consultorios (id, codigo, nombre, piso, sede_id)`
- `medicos (id, cmp, nombres, apellidos, especialidad_id)`
- `agendas_medicas (id, medico_id, especialidad_id, consultorio_id, fecha, hora_inicio, hora_fin, duracion_min, fecha_apertura, publicada)`
- `turnos_slots (id, agenda_id, medico_id, especialidad_id, consultorio_id, fecha_hora_inicio, fecha_hora_fin, turno, estado, version)`
- **Índices críticos:**
  - `idx_slots_disponibilidad` en `turnos_slots (especialidad_id, fecha_hora_inicio, estado) WHERE estado = 'DISPONIBLE'` (índice parcial para acelerar lecturas en misses).
  - `idx_slots_medico_fecha` en `turnos_slots (medico_id, fecha_hora_inicio)` con restricción única `(medico_id, fecha_hora_inicio)` para evitar solapamientos.

### 2. Estrategia de Caché en Redis
- **Llave de caché:** `disp:{especialidadId}:{fecha}:{medicoId|'all'}:{turno|'all'}`
- **TTL:** `60` segundos (`CACHE_TTL_SEC`), evitando datos obsoletos prolongados.
- **Invalidación por Eventos:** Al emitirse `CitaReservadaEvent`, `CitaCanceladaEvent`, `CitaReprogramadaEvent` o `AgendaBloqueadaEvent`, un listener ejecuta `DEL` / `SCAN` por patrón `disp:{especialidadId}:{fecha}:*` para refrescar inmediatamente la vista de cupos.
- **Resiliencia:** Si Redis lanza timeout/error de conexión, el Decorator captura el error, registra un warning y delega a PostgreSQL (*fail-open*).

---

## Contratos de API REST (`/api/v1/...`)

| Método | Ruta | Rol | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/medicos/especialidades` | Público/Auth | Listar especialidades médicas activas |
| `GET` | `/api/v1/medicos` | Público/Auth | Listar médicos filtrando por especialidad |
| `POST` | `/api/v1/agenda/ofertas` | `ADMIN` | Crear oferta médica mensual y generar `TurnoSlot` |
| `PATCH` | `/api/v1/agenda/ofertas/:id/publicar` | `ADMIN` | Publicar agenda para apertura pública |
| `PATCH` | `/api/v1/agenda/slots/bloquear` | `ADMIN`, `MEDICO` | Bloquear rango de slots por licencia/feriado |
| `GET` | `/api/v1/agenda/disponibilidad` | Público/Auth | Consultar cupos libres (servido vía `CachedDisponibilidadDecorator`) |

---

## Estructura de Carpetas del Módulo `agenda`

```text
src/modulos/agenda/
├── dominio/
│   ├── agenda-medica.entity.ts
│   ├── turno-slot.entity.ts
│   ├── estado-slot.vo.ts              # DISPONIBLE | BLOQUEADO_TEMP | RESERVADO | BLOQUEADO
│   ├── disponibilidad.port.ts
│   └── agenda-repository.port.ts
├── aplicacion/
│   ├── consultar-disponibilidad.use-case.ts
│   ├── crear-oferta-medica.use-case.ts
│   ├── bloquear-slots.use-case.ts
│   └── dtos/
├── infraestructura/
│   ├── postgres-agenda.repository.ts
│   ├── postgres-disponibilidad.repository.ts
│   ├── cached-disponibilidad.decorator.ts
│   └── cache-invalidation.listener.ts
├── presentacion/
│   └── agenda.controller.ts
├── agenda.module.ts
└── index.ts
```
