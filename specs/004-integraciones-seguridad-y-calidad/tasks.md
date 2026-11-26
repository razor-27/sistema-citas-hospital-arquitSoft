# Tareas Técnicas: Spec 004 — Integraciones, Seguridad, Auditoría y Pruebas de Calidad

**Spec:** [spec.md](spec.md) | **Plan:** [plan.md](plan.md)  
**Estado:** ✅ Completado | **Fecha:** 2026-11-26

---

## Fase 1 — Auth JWT + RBAC + Auditoría Inmutable (P1)

### Dependencias
- [x] `npm install @nestjs/jwt @nestjs/passport passport passport-jwt argon2 opossum amqplib`
- [x] `npm install --save-dev @types/passport-jwt @types/opossum @types/amqplib`

### Migración SQL
- [x] `migrations/003_usuarios_y_auditoria.sql` — tablas `usuarios` + `auditoria_eventos`
  - [x] Tabla `usuarios` con CHECK rol IN ('PACIENTE','ADMISION','MEDICO','ADMIN')
  - [x] Tabla `auditoria_eventos` append-only con SQL RULES
  - [x] Índices: `idx_usuarios_dni`, `idx_auditoria_cita_id`, `idx_auditoria_codigo_reserva`, `idx_auditoria_usuario_dni`

### Módulo Auth
- [x] `src/modulos/auth/dominio/usuario.entity.ts` — `Usuario.crear()` + `tieneRol()`
- [x] `src/modulos/auth/dominio/usuario-repository.port.ts`
- [x] `src/modulos/auth/aplicacion/auth.dto.ts` — `LoginDto`, `RegistroDto`, `TokenResponseDto`
- [x] `src/modulos/auth/aplicacion/login.use-case.ts` — Argon2 verify + JWT sign
- [x] `src/modulos/auth/aplicacion/registro.use-case.ts` — DNI único + Argon2 hash
- [x] `src/modulos/auth/infraestructura/jwt.strategy.ts`
- [x] `src/modulos/auth/infraestructura/jwt-auth.guard.ts` — 401 en token inválido
- [x] `src/modulos/auth/infraestructura/roles.guard.ts` — 403 si rol no coincide (EQ-05)
- [x] `src/modulos/auth/infraestructura/roles.decorator.ts` — `@Roles(...)`
- [x] `src/modulos/auth/infraestructura/ownership.guard.ts` — Anti-IDOR (EQ-05)
- [x] `src/modulos/auth/infraestructura/argon2-hash.service.ts`
- [x] `src/modulos/auth/infraestructura/postgres-usuario.repository.ts`
- [x] `src/modulos/auth/presentacion/auth.controller.ts` — `POST /api/v1/auth/login` + `/registro`
- [x] `src/modulos/auth/auth.module.ts` + `index.ts`

### Módulo Auditoría
- [x] `src/modulos/auditoria/dominio/auditoria-repository.port.ts` — `EventoAuditoria` + puerto
- [x] `src/modulos/auditoria/infraestructura/auditoria.listener.ts` — Suscribe 7 eventos; fail-safe
- [x] `src/modulos/auditoria/infraestructura/postgres-auditoria.repository.ts`
- [x] `src/modulos/auditoria/presentacion/auditoria.controller.ts`
  - [x] `GET /api/v1/auditoria/citas?citaId=X`
  - [x] `GET /api/v1/auditoria/citas?codigoReserva=CIT-XXX`
  - [x] `GET /api/v1/auditoria/citas?dni=12345678`
  - [x] `GET /api/v1/auditoria/reportes/ocupacion?desde=&hasta=`
- [x] `src/modulos/auditoria/auditoria.module.ts` + `index.ts`

---

## Fase 2 — Pacientes + RENIEC/SIS con Circuit Breaker (P2)

### Migración SQL
- [x] `migrations/004_pacientes.sql` — tabla `pacientes`

### Módulo Pacientes
- [x] `src/modulos/pacientes/dominio/paciente.entity.ts`
- [x] `src/modulos/pacientes/dominio/integracion.ports.ts` — `IdentidadPort`, `AseguramientoPort`
- [x] `src/modulos/pacientes/aplicacion/validar-identidad.use-case.ts` — `Promise.all` RENIEC+SIS
- [x] `src/modulos/pacientes/infraestructura/reniec.adapter.ts` — CB opossum + fallback
- [x] `src/modulos/pacientes/infraestructura/sis-resilient.adapter.ts` — CB opossum + fallback
- [x] `src/modulos/pacientes/presentacion/pacientes.controller.ts`
  - [x] `POST /api/v1/pacientes/validar-identidad/:dni`
  - [x] `GET /api/v1/pacientes/dni/:dni`
- [x] `src/modulos/pacientes/pacientes.module.ts` + `index.ts`

---

## Fase 3 — Notificaciones Asíncronas + DLQ (P2)

### Módulo Notificaciones
- [x] `src/modulos/notificaciones/dominio/notificacion.port.ts`
- [x] `src/modulos/notificaciones/infraestructura/notificacion-adapters.ts`
  - [x] `WhatsAppCloudAdapter`
  - [x] `TwilioSmsAdapter`
- [x] `src/modulos/notificaciones/infraestructura/notificaciones.consumer.ts`
  - [x] Suscripción a `cita.reservada` y `cita.cancelada`
  - [x] Backoff exponencial: 2^(n-1) segundos × 5 intentos
  - [x] DLQ en memoria + `getDlq()` para testing
- [x] `src/modulos/notificaciones/notificaciones.module.ts` + `index.ts`

---

## Fase 4 — Integración Global y App Module

- [x] `src/app.module.ts` — Registrar `AuthModule`, `AuditoriaModule`, `PacientesModule`, `NotificacionesModule`

---

## Fase 5 — Suites de Pruebas de Calidad

### Tests Unitarios
- [x] `test/unit/auth.service.spec.ts` — Login, Registro, Usuario.crear() (EQ-05)
- [x] `test/unit/auth-guards.spec.ts` — RolesGuard + OwnershipGuard (EQ-05 RBAC/IDOR)
- [x] `test/unit/auditoria-listener.spec.ts` — Eventos, fail-safe, búsqueda
- [x] `test/unit/pacientes-circuit-breaker.spec.ts` — Fallback < 800ms (EQ-06)
- [x] `test/unit/notificaciones-consumer.spec.ts` — Reintentos + DLQ

### K6 (Atributos de Calidad — ejecutar con Docker o k6 cloud)
- [x] `test/k6/eq02-rendimiento.js` — 2000 VUs, p95 < 300/800ms
- [x] `test/k6/eq03-spike-5000.js` — 5000 VUs spike, p95 < 1500ms
- [x] `test/k6/eq04-concurrencia.js` — 50 VUs 1 slot → 1×201 + 49×409

### Postman/Newman
- [x] `test/postman/citas-hospital.collection.json`
  - [x] Carpeta Auth: login → 200, credenciales inválidas → 401
  - [x] Carpeta EQ-05: sin token → 401, PACIENTE accede a endpoint ADMIN → 403
  - [x] Carpeta EQ-06: validar-identidad con fallback < 800ms
  - [x] Carpeta Flujo E2E: disponibilidad → reserva → check-in → auditoría

---

## Fase 6 — CI/CD

- [x] `.github/workflows/ci.yml` — 3 jobs:
  - [x] `quality-and-tests`: lint + build + test:cov (umbral 80%)
  - [x] `integration-tests`: PostgreSQL 16 + Redis 7 + migraciones + Newman
  - [x] `security-scan`: CodeQL SAST `security-and-quality`

---

## Verificación Final

```bash
npm run format && npm run lint && npm run build && npm run test:cov
# Exit code 0 | Statements ≥ 80% | Branches ≥ 80% | Functions ≥ 80% | Lines ≥ 80%
```

> **Nota de ejecución de K6 y Newman:**  
> Requieren servicios Docker en ejecución. Desde el directorio raíz:
> ```bash
> docker compose up -d
> psql $DATABASE_URL -f migrations/001_medicos_y_agenda.sql -f migrations/002_citas.sql -f migrations/003_usuarios_y_auditoria.sql -f migrations/004_pacientes.sql
> npm run start:dev
> npx newman run test/postman/citas-hospital.collection.json --env-var baseUrl=http://localhost:3000
> k6 run test/k6/eq02-rendimiento.js --env BASE_URL=http://localhost:3000
> ```
