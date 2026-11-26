# Tareas: Consulta de Disponibilidad y Oferta Médica

**Entrada:** [spec.md](spec.md), [plan.md](plan.md)  
**Formato:** `[ ] [ID] [P?] [Historia?] Descripción con ruta exacta`

---

## Fase 1: Migraciones de Base de Datos y Catálogo `medicos`

- [ ] T001 Crear migración SQL inicial para `especialidades`, `consultorios`, `medicos`, `agendas_medicas` y `turnos_slots` con índice parcial `idx_slots_disponibilidad`.
- [ ] T002 [P] Implementar entidades, puertos y repositorio PostgreSQL del módulo `medicos` en `src/modulos/medicos/` exponiendo consultas vía `src/modulos/medicos/index.ts`.
- [ ] T003 [P] Implementar `GET /api/v1/medicos/especialidades` y `GET /api/v1/medicos` con documentación Swagger en `src/modulos/medicos/presentacion/medicos.controller.ts`.

---

## Fase 2: Dominio y Aplicación del Módulo `agenda`

- [ ] T004 [P] Implementar `EstadoSlot`, `TurnoSlot` y `AgendaMedica` (generación de slots de 15/20/30 min y reglas de bloqueo) en `src/modulos/agenda/dominio/`.
- [ ] T005 [P] Definir puertos `DisponibilidadPort` y `AgendaRepositoryPort` en `src/modulos/agenda/dominio/`.
- [ ] T006 Escribir pruebas unitarias de dominio para `AgendaMedica` y `TurnoSlot` en `test/unit/agenda/agenda-medica.spec.ts`.

---

## Fase 3: Historia de Usuario 2 y 3 - Oferta Médica y Bloqueos (Prioridad: P1/P2)

- [ ] T007 [US2] Implementar `CrearOfertaMedicaUseCase` y `PublicarAgendaUseCase` en `src/modulos/agenda/aplicacion/`.
- [ ] T008 [US3] Implementar `BloquearSlotsUseCase` emitiendo `AgendaBloqueadaEvent` en `src/modulos/agenda/aplicacion/bloquear-slots.use-case.ts`.
- [ ] T009 [P] [US2] Implementar `PostgresAgendaRepository` en `src/modulos/agenda/infraestructura/postgres-agenda.repository.ts`.
- [ ] T010 [P] [US2] Escribir pruebas unitarias para `CrearOfertaMedicaUseCase` y `BloquearSlotsUseCase` usando repositorios en memoria en `test/unit/agenda/`.

---

## Fase 4: Historia de Usuario 1 - Consulta de Disponibilidad con Caché Redis (Prioridad: P1)

- [ ] T011 [US1] Implementar `PostgresDisponibilidadRepository` con consulta optimizada por índice parcial en `src/modulos/agenda/infraestructura/postgres-disponibilidad.repository.ts`.
- [ ] T012 [US1] Implementar `CachedDisponibilidadDecorator` (Redis TTL 60 s + *fail-open* fallback) en `src/modulos/agenda/infraestructura/cached-disponibilidad.decorator.ts`.
- [ ] T013 [US1] Implementar `CacheInvalidationListener` escuchando eventos de reserva/cancelación/bloqueo en `src/modulos/agenda/infraestructura/cache-invalidation.listener.ts`.
- [ ] T014 [US1] Implementar `ConsultarDisponibilidadUseCase` y `AgendaController` (`GET /api/v1/agenda/disponibilidad`, `POST /api/v1/agenda/ofertas`, `PATCH /api/v1/agenda/slots/bloquear`) con DTOs y Swagger en `src/modulos/agenda/presentacion/agenda.controller.ts`.
- [ ] T015 [P] [US1] Escribir pruebas unitarias para `CachedDisponibilidadDecorator` (Cache Hit, Cache Miss, Redis Caído) y `ConsultarDisponibilidadUseCase` en `test/unit/agenda/`.
