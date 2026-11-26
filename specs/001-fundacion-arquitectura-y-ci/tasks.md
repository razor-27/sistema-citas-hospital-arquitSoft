# Tareas: Fundación Arquitectónica, Infraestructura y CI/CD

**Entrada:** [spec.md](spec.md), [plan.md](plan.md)  
**Formato:** `[ ] [ID] [P?] [Historia?] Descripción con ruta exacta`

---

## Fase 1: Configuración Inicial del Proyecto (Setup)

- [x] T001 Inicializar proyecto Node.js + TypeScript + NestJS en `package.json` y `tsconfig.json` con soporte estricto (`strict: true`).
- [x] T002 [P] Configurar ESLint, Prettier y reglas de arquitectura (prohibir imports desde `infraestructura/` hacia `dominio/`) en `eslint.config.mjs`.
- [x] T003 [P] Crear `docker-compose.yml` con servicios `postgres:16-alpine`, `redis:7-alpine` y `rabbitmq:3-management-alpine` con healthchecks.
- [x] T004 [P] Crear `.env.example` con `PORT`, `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`, `JWT_SECRET`, `LOCK_TTL_MS`, `CACHE_TTL_SEC`.

---

## Fase 2: Shared Kernel e Infraestructura Transversal (Fundacional)

- [x] T005 Implementar validación de variables de entorno en `src/shared/config/env.validation.ts`.
- [x] T006 [P] Crear jerarquía de errores de dominio agnósticos a HTTP en `src/shared/errores/` (`ReglaNegocioError`, `ConflictoConcurrenciaError`, `RecursoNoEncontradoError`).
- [x] T007 Implementar filtro global de excepciones HTTP en `src/shared/infraestructura/http-exception.filter.ts` mapeando errores de dominio a `422/400`, `409`, `404`.
- [x] T008 Crear estructura base de carpetas (`dominio/`, `aplicacion/`, `infraestructura/`, `presentacion/`, `index.ts`) para los módulos en `src/modulos/`.

---

## Fase 3: Historia de Usuario 1 y 2 - Salud, Bootstrap y Swagger (Prioridad: P1)

- [x] T009 [US1] Implementar `GET /health` verificando PostgreSQL y Redis en `src/shared/infraestructura/health.controller.ts`.
- [x] T010 [US2] Configurar `src/main.ts` con `ValidationPipe` global (`whitelist: true`, `transform: true`) y `SwaggerModule` en `/api/docs`.
- [x] T011 [P] [US1] Escribir pruebas unitarias para `HttpExceptionFilter` y `HealthController` en `test/unit/shared/`.

---

## Fase 4: Historia de Usuario 3 - Pruebas, Cobertura y CI/CD (Prioridad: P1)

- [x] T012 [US3] Configurar Jest en `jest.config.ts` con `coverageThreshold` mínimo de 80% en ramas, funciones, líneas y sentencias.
- [x] T013 [US3] Crear workflow de GitHub Actions en `.github/workflows/ci.yml` ejecutando `npm ci`, `npm run lint`, `npm run build` y `npm run test:cov` con subida del reporte de cobertura como artefacto.
- [ ] T014 Verificar localmente `docker compose up -d` y acceso en vivo a `GET /health` y `GET /api/docs` (requiere iniciar el daemon de Docker).
