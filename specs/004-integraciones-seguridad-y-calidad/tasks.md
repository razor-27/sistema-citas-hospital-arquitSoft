# Tareas: Seguridad, Integraciones Resilientes, Auditoría y Pruebas de Calidad

**Entrada:** [spec.md](spec.md), [plan.md](plan.md)  
**Formato:** `[ ] [ID] [P?] [Historia?] Descripción con ruta exacta`

---

## Fase 1: Historia de Usuario 1 - Autenticación JWT, RBAC y Auditoría (Prioridad: P1)

- [ ] T001 [US1] Crear migraciones SQL para `usuarios` y `auditoria_eventos` (*append-only*) con índices por `codigo_reserva` y `dni`.
- [ ] T002 [US1] Implementar módulo `auth` (`POST /api/v1/auth/login`, `POST /api/v1/auth/registro`, `JwtAuthGuard`, `RolesGuard`) en `src/modulos/auth/`.
- [ ] T003 [US1] Implementar módulo `auditoria` con listener de eventos de citas (`AuditoriaListener`) y endpoints `GET /api/v1/auditoria/citas` y `reportes/ocupacion` en `src/modulos/auditoria/`.
- [ ] T004 [P] [US1] Escribir pruebas unitarias para `RolesGuard`, política anti-IDOR y `AuditoriaListener` en `test/unit/auth/` y `test/unit/auditoria/`.

---

## Fase 2: Historia de Usuario 2 - Pacientes, RENIEC y SIS con Circuit Breaker (Prioridad: P2)

- [ ] T005 [US2] Crear migración SQL para tabla `pacientes` (índice único en `dni`).
- [ ] T006 [US2] Definir puertos `IdentidadPort` y `AseguramientoPort` en `src/modulos/pacientes/dominio/`.
- [ ] T007 [US2] Implementar `ReniecAdapter` y `SISResilientAdapter` con `opossum` (Circuit Breaker + fallback) en `src/modulos/pacientes/infraestructura/`.
- [ ] T008 [US2] Implementar `ValidarIdentidadUseCase`, `BuscarPorDniUseCase` y `PacientesController` en `src/modulos/pacientes/`.
- [ ] T009 [P] [US2] Escribir pruebas unitarias del Circuit Breaker (estado cerrado, abierto y *fallback* ante timeout) en `test/unit/pacientes/`.

---

## Fase 3: Historia de Usuario 3 - Notificaciones Asíncronas RabbitMQ + DLQ (Prioridad: P2)

- [ ] T010 [US3] Implementar `RabbitMQEventPublisher` y consumidor con cola principal + DLQ y reintentos exponenciales en `src/modulos/notificaciones/infraestructura/`.
- [ ] T011 [P] [US3] Implementar `NotificacionPort`, `WhatsAppCloudAdapter` y `TwilioSmsAdapter` en `src/modulos/notificaciones/`.
- [ ] T012 [P] [US3] Escribir pruebas unitarias para despacho de plantillas y manejo de fallo hacia DLQ en `test/unit/notificaciones/`.

---

## Fase 4: Historia de Usuario 4 - Suite Postman/Newman, k6 y CI/CD Final (Prioridad: P1)

- [ ] T013 [P] [US4] Crear colección Postman (`test/postman/citas-hospital.collection.json`) cubriendo flujo E2E, contratos OpenAPI, RBAC, IDOR (EQ-05) y resiliencia con mock (EQ-06).
- [ ] T014 [P] [US4] Crear scripts k6 en `test/k6/` para `eq02-rendimiento.js`, `eq03-spike-5000.js` y `eq04-concurrencia.js`.
- [ ] T015 [US4] Actualizar `.github/workflows/ci.yml` agregando job de pruebas de integración/contrato con servicios PostgreSQL/Redis y ejecución de Newman.
- [ ] T016 Ejecutar `npm run test:cov`, `newman run` y `k6 run` contra Docker Compose, documentando resultados de cobertura y escenarios EQ-01..EQ-06.
