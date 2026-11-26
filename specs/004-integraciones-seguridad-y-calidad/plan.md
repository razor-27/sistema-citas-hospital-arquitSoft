# Plan Técnico: Seguridad, Integraciones Resilientes, Auditoría y Pruebas de Calidad

**Rama:** `004-integraciones-seguridad-y-calidad` | **Fecha:** 2026-11-25 | **Spec:** [spec.md](spec.md)

---

## Resumen

Completar el Monolito Modular implementando `auth` (JWT + RBAC), `pacientes` (padrón + adaptadores RENIEC/SIS con Circuit Breaker *Opossum*), `notificaciones` (productor/consumidor RabbitMQ con DLQ y adaptadores WhatsApp/SMS), `auditoria` (tabla *append-only* + reportes sobre réplica/lectura), y construir la suite automatizada de verificación de calidad con **Postman/Newman** y **k6** integrada al CI/CD.

---

## Contexto Técnico

- **Seguridad:** `@nestjs/jwt`, `passport-jwt`, `argon2` / `bcrypt`, Guards RBAC y Ownership (anti-IDOR)
- **Resiliencia Externa:** `opossum` (Circuit Breaker: `timeout: 3000 ms`, `errorThresholdPercentage: 50`, `resetTimeout: 30000 ms`)
- **Mensajería:** RabbitMQ (`amqplib`) con exchange `citas.events`, cola `notificaciones.queue` y `notificaciones.dlq`
- **Pruebas de Calidad:** Postman Collection + Newman CLI (`test/postman/`), scripts k6 (`test/k6/`)

---

## Verificación de Constitución (*Constitution Check*)

| Principio | Cumplimiento | Evidencia en el Plan |
| :--- | :---: | :--- |
| **I. Monolito Modular** | ✅ | `auditoria` y `notificaciones` se suscriben a eventos sin acoplar `citas`. |
| **II. Clean Architecture** | ✅ | `AseguramientoPort` y `NotificacionPort` en `dominio/`; Opossum y RabbitMQ en `infraestructura/`. |
| **III. SOLID (OCP, DIP)** | ✅ | Nuevos canales de notificación se agregan implementando `NotificacionPort` (OCP). |
| **VI. Seguridad y Ley 29733** | ✅ | JWT + RBAC + hash Argon2 + auditoría inmutable sin `UPDATE/DELETE`. |
| **VIII. Pruebas Calidad** | ✅ | Suites Postman/Newman y k6 cubriendo EQ-01 a EQ-06. |

---

## Contratos de API REST (`/api/v1/...`)

| Método | Ruta | Rol | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Público | Autenticación y emisión de JWT |
| `POST` | `/api/v1/auth/registro` | Público | Registro de paciente |
| `POST` | `/api/v1/pacientes/validar-identidad` | `ADMISION`, `PACIENTE` | Consulta RENIEC + SIS con Circuit Breaker |
| `GET` | `/api/v1/pacientes/dni/:dni` | `ADMISION` | Búsqueda rápida por DNI (`< 1 s`) |
| `GET` | `/api/v1/auditoria/citas` | `ADMIN` | Historial inmutable por DNI, HC o código |
| `GET` | `/api/v1/auditoria/reportes/ocupacion` | `ADMIN` | Reporte de ocupación, *no-show* y demanda |

---

## Matriz de Pruebas de Atributos de Calidad (Postman + k6)

| Escenario | Herramienta | Archivo | Umbral de Aceptación |
| :--- | :--- | :--- | :--- |
| **EQ-01 Disponibilidad** | k6 + Docker | `test/k6/eq01-failover.js` | `GET /health` < 100 ms; 0% fallos tras caída de réplica |
| **EQ-02 Rendimiento** | k6 | `test/k6/eq02-rendimiento.js` | Lectura `p95 < 300 ms`, Reserva `p95 < 800 ms` (10:1) |
| **EQ-03 Escalabilidad** | k6 (Spike) | `test/k6/eq03-spike-5000.js` | 500 → 5,000 VUs, error `< 0.1%`, `p95 < 1.5 s` |
| **EQ-04 Consistencia** | k6 | `test/k6/eq04-concurrencia.js` | 50 VUs mismo `slotId`: 1 `201` + 49 `409` (`< 200 ms`) |
| **EQ-05 Seguridad** | Postman/Newman | `test/postman/citas-hospital.collection.json` | 100% bloqueo `401/403` en IDOR y RBAC |
| **EQ-06 Tolerancia Fallos** | Postman + Mock | `test/postman/eq06-resiliencia.collection.json` | Reserva `< 800 ms` aun con SIS/WhatsApp en timeout 60 s |
