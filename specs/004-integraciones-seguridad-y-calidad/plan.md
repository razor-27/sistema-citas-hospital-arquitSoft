# Plan Técnico: Spec 004 — Integraciones, Seguridad, Auditoría y Pruebas de Calidad

**Rama:** `004-integraciones-seguridad-y-calidad` | **Fecha:** 2026-11-26 | **Spec:** [spec.md](spec.md)

---

## Constitution Check

| Principio | Verificación | Estado |
|-----------|-------------|--------|
| **I – Monolito Modular** | Auth, Auditoria, Pacientes, Notificaciones como módulos independientes con límites explícitos | ✅ |
| **II – Clean Architecture** | Dominio sin dependencias externas; puertos IdentidadPort/AseguramientoPort en dominio; adapters en infraestructura | ✅ |
| **III – SOLID** | SRP: cada clase una responsabilidad; OCP: nuevos canales sin modificar Consumer; DIP: puertos inyectados por tokens | ✅ |
| **IV – Patrones** | Adapter (RENIEC/SIS), Strategy (NotificacionPort por canal), Circuit Breaker (opossum), Decorator (CachedDisponibilidad) | ✅ |
| **V – Seguridad** | JWT + RBAC (RolesGuard) + Anti-IDOR (OwnershipGuard) + Auditoría append-only + Argon2 passwords | ✅ |
| **VI – Observabilidad** | AuditoriaListener registra 7 tipos de eventos; Logger en adapters; reporte de ocupación | ✅ |
| **VII – Resiliencia** | Circuit Breaker Opossum (timeout 3s, umbral 50%, reset 30s) + fallback inmediato + DLQ + backoff exponencial | ✅ |
| **VIII – Testing** | Cobertura ≥ 80%; pruebas de guards, use cases, listener, circuit breaker; suites K6 (EQ-02/03/04) y Postman (EQ-05/06) | ✅ |

---

## Blueprint de Implementación

### Módulo Auth — JWT + RBAC

```
src/modulos/auth/
├── dominio/
│   ├── usuario.entity.ts        — Entidad con validación DNI; tieneRol()
│   └── usuario-repository.port.ts
├── aplicacion/
│   ├── auth.dto.ts              — LoginDto, RegistroDto, TokenResponseDto
│   ├── login.use-case.ts        — Verifica Argon2, emite JWT (1h)
│   └── registro.use-case.ts    — DNI único, hashea password
├── infraestructura/
│   ├── jwt.strategy.ts          — PassportStrategy('jwt'), extrae {sub, dni, rol}
│   ├── jwt-auth.guard.ts        — AuthGuard('jwt'), lanza 401
│   ├── roles.guard.ts           — Lee @Roles(), lanza 403 (EQ-05 RBAC)
│   ├── roles.decorator.ts       — @Roles(...Rol[])
│   ├── ownership.guard.ts       — Anti-IDOR, lanza 403 (EQ-05)
│   ├── argon2-hash.service.ts   — Import dinámico de argon2 (evita problemas nativo en tests)
│   └── postgres-usuario.repository.ts
└── presentacion/
    └── auth.controller.ts       — POST /api/v1/auth/login + /registro
```

### Módulo Auditoría — Append-Only

```
src/modulos/auditoria/
├── dominio/auditoria-repository.port.ts   — EventoAuditoria + puerto abstracto
├── infraestructura/
│   ├── auditoria.listener.ts    — Suscribe 7 eventos EventBus; fail-safe
│   └── postgres-auditoria.repository.ts   — INSERT; SQL RULES bloquean UPDATE/DELETE
└── presentacion/auditoria.controller.ts   — GET /auditoria/citas + /reportes/ocupacion
```

**Inmutabilidad garantizada a nivel de BD:** `CREATE RULE auditoria_no_update AS ON UPDATE TO auditoria_eventos DO INSTEAD NOTHING`.

### Módulo Pacientes + Circuit Breaker

```
src/modulos/pacientes/
├── dominio/integracion.ports.ts   — IdentidadPort (RENIEC), AseguramientoPort (SIS)
├── aplicacion/validar-identidad.use-case.ts  — Promise.all(RENIEC, SIS)
└── infraestructura/
    ├── reniec.adapter.ts          — CB lazy-init, fallback validado=false
    └── sis-resilient.adapter.ts   — CB lazy-init, fallback PENDIENTE_VALIDACION
```

**Config CB:** timeout 3000ms | errorThresholdPercentage 50% | resetTimeout 30000ms  
**EQ-06 garantizado:** Fallback retorna inmediatamente cuando CB abre → latencia < 800ms.

### Módulo Notificaciones — DLQ + Backoff

```
src/modulos/notificaciones/
├── dominio/notificacion.port.ts   — NotificacionPort abstracto
├── infraestructura/
│   ├── notificacion-adapters.ts   — WhatsAppCloudAdapter + TwilioSmsAdapter
│   └── notificaciones.consumer.ts — Backoff exp 2^(n-1)s × 5 intentos → DLQ
```

### Suites de Pruebas de Calidad

| Archivo | Escenario | Herramienta |
|---------|-----------|-------------|
| `test/k6/eq02-rendimiento.js` | 2000 VUs, 2min, 10:1 lectura/escritura; p95<300/800ms | k6 |
| `test/k6/eq03-spike-5000.js` | Rampa 500→5000 VUs; p95<1500ms | k6 |
| `test/k6/eq04-concurrencia.js` | 50 VUs mismo slot → 1×201 + 49×409 | k6 |
| `test/postman/citas-hospital.collection.json` | Auth 401/403, RBAC, CB, Flujo E2E | Newman |

### CI/CD — 3 Jobs

1. **quality-and-tests:** lint → build → test:cov (umbral 80%)
2. **integration-tests:** PostgreSQL 16 + Redis 7 services → migraciones → Newman
3. **security-scan:** CodeQL SAST `security-and-quality`

---

## ADRs Generados

| ADR | Decisión |
|-----|---------|
| ADR-011 | Argon2id para hashing de contraseñas (import dinámico para tests) |
| ADR-012 | Auditoría append-only con SQL RULES en PostgreSQL |
| ADR-013 | Circuit Breaker lazy-init con opossum para adapters RENIEC/SIS |
