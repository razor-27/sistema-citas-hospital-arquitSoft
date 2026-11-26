# Tareas: Reserva Atómica y Gestión del Ciclo de Vida de Citas

**Entrada:** [spec.md](spec.md), [plan.md](plan.md)  
**Formato:** `[ ] [ID] [P?] [Historia?] Descripción con ruta exacta`

---

## Fase 1: Persistencia y Capa de Dominio de `citas`

- [x] T001 Crear migración SQL para tabla `citas` con índice único parcial `uq_citas_slot_activo` en `migrations/002_citas.sql`.
- [x] T002 [P] Implementar `EstadoCita`, `CodigoReserva`, `Cita` (con `crear`, `confirmar`, `cancelar`, `reprogramar`, `realizarCheckIn`, `marcarAtendida`, `marcarNoAsistio`) en `src/modulos/citas/dominio/`.
- [x] T003 [P] Implementar `PoliticaReservaService` (elegibilidad, regla de 24h, ventana de check-in 45–10 min, tope de sobrecupos) en `src/modulos/citas/dominio/politica-reserva.service.ts`.
- [x] T004 [P] Definir puertos `CitaRepositoryPort`, `DistributedLockPort` y eventos de dominio en `src/modulos/citas/dominio/`.
- [x] T005 Escribir pruebas unitarias exhaustivas de `Cita` y `PoliticaReservaService` en `test/unit/citas/cita-dominio.spec.ts`.

---

## Fase 2: Historia de Usuario 1 - Reserva Atómica y Concurrencia (Prioridad: P1)

- [x] T006 [US1] Implementar `RedisDistributedLockAdapter` (`SET NX PX` + script Lua de liberación segura) en `src/modulos/citas/infraestructura/redis-distributed-lock.ts`.
- [x] T007 [US1] Implementar `PostgresCitaRepository` con soporte transaccional ACID (`SELECT ... FOR UPDATE`) en `src/modulos/citas/infraestructura/postgres-cita.repository.ts`.
- [x] T008 [US1] Implementar `ReservarCitaUseCase` orquestando lock Redis, bloqueo pesimista de slot, validación de dominio, persistencia y publicación de `CitaReservadaEvent` en `src/modulos/citas/aplicacion/reservar-cita.use-case.ts`.
- [x] T009 [P] [US1] Escribir pruebas unitarias de `ReservarCitaUseCase` (éxito, conflicto de lock `409`, slot no disponible, liberación de lock en error) en `test/unit/citas/reservar-cita.use-case.spec.ts`.

---

## Fase 3: Historia de Usuario 2 - Consulta, Cancelación y Reprogramación (Prioridad: P1)

- [x] T010 [US2] Implementar `CancelarCitaUseCase` y `ReprogramarCitaUseCase` en `src/modulos/citas/aplicacion/`.
- [x] T011 [P] [US2] Escribir pruebas unitarias de cancelación/reprogramación (regla >= 24h, liberación de slot, rechazo de cita atendida) en `test/unit/citas/`.

---

## Fase 4: Historias de Usuario 3 y 4 - Ventanilla, Check-in y Tablero Médico (Prioridad: P2)

- [x] T012 [US3] Implementar `RegistrarSobrecupoUseCase` y `VentanillaCitaController` (`POST /api/v1/ventanilla/citas/sobrecupo`) en `src/modulos/citas/`.
- [x] T013 [US4] Implementar `CheckInUseCase` y `ConsultarCitasUseCase` (agenda médica y actualización clínica) en `src/modulos/citas/aplicacion/`.
- [x] T014 [US1][US2][US4] Implementar `CitaController` (`/api/v1/citas/*`) con DTOs validados, control anti-IDOR y anotaciones Swagger en `src/modulos/citas/presentacion/cita.controller.ts`.
- [x] T015 [P] [US3][US4] Escribir pruebas unitarias para `CheckInUseCase` y `RegistrarSobrecupoUseCase` en `test/unit/citas/`.
- [x] T016 Ensamblar `CitasModule` en `src/modulos/citas/citas.module.ts` y escribir prueba de concurrencia (50 peticiones simultáneas al mismo `slotId` validando 1 éxito y 49 `ConflictoConcurrenciaError`).
