# Plan Técnico: Reserva Atómica y Gestión del Ciclo de Vida de Citas

**Rama:** `003-reserva-atomica-y-gestion-citas` | **Fecha:** 2026-11-25 | **Spec:** [spec.md](spec.md)

---

## Resumen

Implementar el módulo núcleo `citas` (`src/modulos/citas/`) siguiendo Clean Architecture, Arquitectura Hexagonal y SOLID. Se implementa la doble barrera de consistencia (**Redis Distributed Lock `SET NX PX`** + **PostgreSQL `SELECT ... FOR UPDATE` e índice único parcial**), publicación de eventos de dominio (`CitaReservadaEvent`, `CitaCanceladaEvent`, `CitaReprogramadaEvent`) y los controladores REST separados para pacientes/médicos (`CitaController`) y admisión (`VentanillaCitaController`).

---

## Contexto Técnico

- **Módulo:** `src/modulos/citas/` (interactúa con `agenda` y `pacientes` vía sus `index.ts`)
- **Persistencia:** PostgreSQL 16 (tabla `citas` con índice único parcial)
- **Lock Distribuido:** Redis 7 (`SET key token NX PX ttl` + liberación atómica con script Lua comparando token)
- **Estándares:** HL7 FHIR `Appointment`

---

## Verificación de Constitución (*Constitution Check*)

| Principio | Cumplimiento | Evidencia en el Plan |
| :--- | :---: | :--- |
| **I. Monolito Modular** | ✅ | `citas` no accede a tablas de `agenda`; usa puertos/API pública. |
| **II. Clean Architecture** | ✅ | `Cita`, `PoliticaReservaService` y puertos en `dominio/` sin imports externos. |
| **III. SOLID y Patrones** | ✅ | SRP por caso de uso; DIP con `CitaRepositoryPort`, `DistributedLockPort`, `EventPublisherPort`. |
| **IV. Zero Double-Booking** | ✅ | Redis `SET NX PX` + PostgreSQL `SELECT ... FOR UPDATE` + `UNIQUE INDEX`. |
| **VII. API Documentada** | ✅ | Endpoints `/api/v1/citas` y `/api/v1/ventanilla/citas` documentados en Swagger. |
| **VIII. Cobertura >= 80%** | ✅ | Tests unitarios con `InMemoryCitaRepository` y `MockLockService` (< 5 ms por suite). |

---

## Análisis de Base de Datos y Concurrencia

### 1. Esquema PostgreSQL (`citas`)
- `citas (id UUID PK, codigo_reserva VARCHAR(12) UNIQUE, paciente_id UUID, slot_id UUID, medico_id UUID, especialidad_id UUID, fecha_hora_inicio TIMESTAMPTZ, estado VARCHAR(20), es_sobrecupo BOOLEAN, motivo_sobrecupo TEXT, motivo_cancelacion TEXT, creado_por UUID, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`
- **Restricción física anti-doble reserva:**
  ```sql
  CREATE UNIQUE INDEX uq_citas_slot_activo
  ON citas (slot_id)
  WHERE estado NOT IN ('CANCELADA', 'NO_ASISTIO') AND es_sobrecupo = FALSE;
  ```
- **Flujo transaccional en `ReservarCitaUseCase`:**
  1. `RedisDistributedLock.adquirirLock("lock:slot:" + slotId, 10000)` → Si falla, lanza `ConflictoConcurrenciaError` (`409`).
  2. `BEGIN TRANSACTION` en PostgreSQL.
  3. `SELECT ... FOR UPDATE` sobre `turnos_slots` verificando `estado = 'DISPONIBLE'`.
  4. `PoliticaReservaService.validarElegibilidad(...)`.
  5. `INSERT INTO citas` + `UPDATE turnos_slots SET estado = 'RESERVADO'`.
  6. `COMMIT`.
  7. `EventPublisher.publicar(CitaReservadaEvent)` (invalida caché Redis + encola notificación/auditoría).
  8. `finally`: `RedisDistributedLock.liberarLock(...)` mediante script Lua seguro (`if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`).

---

## Contratos de API REST (`/api/v1/...`)

| Método | Ruta | Rol | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/citas` | `PACIENTE`, `ADMISION` | Reservar cita atómicamente (`201` / `409` / `422`) |
| `GET` | `/api/v1/citas/mias` | `PACIENTE` | Listar citas del paciente autenticado |
| `GET` | `/api/v1/citas/:id` | `PACIENTE` (dueño), `ADMISION`, `MEDICO` | Detalle de cita (con control anti-IDOR) |
| `PATCH` | `/api/v1/citas/:id/cancelar` | `PACIENTE`, `ADMISION` | Cancelar cita y liberar cupo |
| `PATCH` | `/api/v1/citas/:id/reprogramar` | `PACIENTE`, `ADMISION` | Reprogramar a un nuevo `slotId` atómicamente |
| `PATCH` | `/api/v1/citas/:id/check-in` | `PACIENTE`, `ADMISION` | Confirmar presencia en sala (45–10 min previos) |
| `GET` | `/api/v1/citas/agenda-medica` | `MEDICO` | Agenda cronológica del médico por fecha |
| `PATCH` | `/api/v1/citas/:id/estado-clinico` | `MEDICO` | Marcar `ATENDIDA` o `NO_ASISTIO` |
| `POST` | `/api/v1/ventanilla/citas/sobrecupo` | `ADMISION` | Registrar sobrecupo con justificación y límite |

---

## Estructura de Carpetas (`src/modulos/citas/`)

Sigue exactamente el diseño de [diseño-interno-de-modulos.md](../../docs/03-diseño-de-software/diseño-interno/diseño-interno-de-modulos.md):
`dominio/` (`cita.entity.ts`, `codigo-reserva.vo.ts`, `estado-cita.vo.ts`, `politica-reserva.service.ts`, puertos), `aplicacion/` (`reservar-cita.use-case.ts`, `cancelar-cita.use-case.ts`, `reprogramar-cita.use-case.ts`, `check-in.use-case.ts`, `registrar-sobrecupo.use-case.ts`, `dtos/`), `infraestructura/` (`postgres-cita.repository.ts`, `redis-distributed-lock.ts`, `rabbitmq-event-publisher.ts`), `presentacion/` (`cita.controller.ts`, `ventanilla-cita.controller.ts`), `citas.module.ts`, `index.ts`.
