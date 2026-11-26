# Especificación de Funcionalidad: Fundación Arquitectónica, Infraestructura y CI/CD

**Rama de Funcionalidad:** `001-fundacion-arquitectura-y-ci`  
**Creado:** 2026-11-25  
**Estado:** Borrador (Listo para Planificación)  
**Entrada:** Establecer el esqueleto del Monolito Modular con Clean Architecture, entorno reproducible (PostgreSQL, Redis, RabbitMQ), endpoint de salud `/health`, documentación OpenAPI/Swagger, base de pruebas unitarias con cobertura y pipeline CI/CD en GitHub Actions.

---

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Arranque reproducible y monitoreo de salud del monolito (Prioridad: P1)

Como **ingeniero de plataforma / balanceador de carga**, quiero levantar el backend junto con sus dependencias (PostgreSQL, Redis, RabbitMQ) y consultar un endpoint `/health`, para verificar que la aplicación es *stateless*, está lista para recibir tráfico y permite failover en menos de 3 segundos.

**Por qué esta prioridad:** Sin la base del proyecto, contenedores y verificación de salud, ningún módulo de negocio puede ejecutarse ni cumplir con el escenario de disponibilidad EQ-01.

**Prueba Independiente:** Levantar los servicios con Docker Compose y ejecutar `GET /health` verificando respuesta `HTTP 200` con estado `up` de API, PostgreSQL y Redis.

**Escenarios de Aceptación:**

1. **Dado** que los servicios de PostgreSQL, Redis y RabbitMQ están activos, **Cuando** se inicia la aplicación backend y se consulta `GET /health`, **Entonces** el sistema responde `HTTP 200 OK` en menos de 100 ms indicando el estado saludable de base de datos y caché.
2. **Dado** que se ejecuta la aplicación en múltiples réplicas detrás de un balanceador, **Cuando** una réplica se detiene abruptamente, **Entonces** el health-check detecta la caída sin perder estado de sesión en memoria.

---

### Historia de Usuario 2 - Documentación interactiva OpenAPI/Swagger de la API REST (Prioridad: P1)

Como **desarrollador frontend / QA**, quiero consultar la especificación OpenAPI 3.0 en `/api/docs`, para conocer los endpoints `/api/v1/...`, esquemas DTO, códigos HTTP y requisitos de autenticación JWT sin leer el código fuente.

**Por qué esta prioridad:** Garantiza contratos explícitos desde el día 1 para pruebas con Postman y consumo web/móvil.

**Prueba Independiente:** Acceder a `GET /api/docs` y `GET /api/docs-json` y validar que el documento OpenAPI 3.0 es válido.

**Escenarios de Aceptación:**

1. **Dado** que el servidor está en ejecución, **Cuando** un cliente solicita `GET /api/docs`, **Entonces** se renderiza la interfaz Swagger UI con los esquemas de seguridad Bearer JWT y el endpoint `/health`.

---

### Historia de Usuario 3 - Validación automática de calidad y cobertura en CI/CD (Prioridad: P1)

Como **equipo de ingeniería**, quiero que cada *push* o *pull request* ejecute linting, compilación TypeScript, pruebas unitarias y reporte de cobertura en GitHub Actions, para impedir que código sin pruebas o con errores de arquitectura llegue a la rama principal.

**Por qué esta prioridad:** Asegura la calidad continua y el cumplimiento del umbral mínimo de 80% de cobertura desde la primera iteración.

**Prueba Independiente:** Ejecutar `npm run lint`, `npm run build` y `npm run test:cov` localmente y verificar el workflow `.github/workflows/ci.yml`.

**Escenarios de Aceptación:**

1. **Dado** un cambio en el código fuente, **Cuando** se ejecuta el pipeline de GitHub Actions, **Entonces** se ejecutan lint, build y suite de pruebas unitarias generando el reporte de cobertura (`lcov` / `coverage-summary.json`).
2. **Dado** que la cobertura de `dominio/` y `aplicacion/` cae por debajo del 80%, **Cuando** finaliza la ejecución de pruebas en CI, **Entonces** el pipeline falla reportando el déficit de cobertura.

---

### Casos Borde *(Edge Cases)*
- ¿Qué ocurre si PostgreSQL o Redis no están disponibles al consultar `/health`? El endpoint debe responder `HTTP 503 Service Unavailable` detallando el componente degradado sin tumbar el proceso si es recuperable.
- ¿Qué ocurre si falta una variable de entorno crítica (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`) al arrancar? La aplicación debe fallar rápido (*fail-fast*) en el arranque con un mensaje de validación claro.

---

## Requisitos *(obligatorio)*

### Requisitos Funcionales
- **FR-001:** El sistema DEBE inicializar la estructura de carpetas del Monolito Modular (`src/modulos/{auth,pacientes,medicos,agenda,citas,notificaciones,auditoria}` y `src/shared/`) siguiendo Clean Architecture.
- **FR-002:** El sistema DEBE proveer validación tipada de variables de entorno al arranque.
- **FR-003:** El sistema DEBE exponer `GET /health` verificando conectividad real a PostgreSQL y Redis (EQ-01).
- **FR-004:** El sistema DEBE exponer documentación OpenAPI 3.0 en `/api/docs` y `/api/docs-json`.
- **FR-005:** El sistema DEBE incluir un manejo global de excepciones que mapee errores de dominio (`ReglaNegocioError`, `ConflictoConcurrenciaError`, `RecursoNoEncontradoError`) a códigos HTTP estándar (`400/422`, `409`, `404`).
- **FR-006:** El proyecto DEBE incluir configuración de pruebas unitarias con reporte de cobertura (umbral >= 80%) y un workflow de GitHub Actions (`.github/workflows/ci.yml`).

### Entidades / Artefactos Clave
- **Shared Kernel (`src/shared/`):** Clases base de errores de dominio, interfaz de `EventBus`, configuración y logger estructurado.
- **Infraestructura Base:** `docker-compose.yml` con PostgreSQL 16, Redis 7 y RabbitMQ 3.

---

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles
- **SC-001:** `docker compose up -d` levanta PostgreSQL, Redis y RabbitMQ saludables en menos de 30 segundos.
- **SC-002:** `GET /health` responde `200 OK` en `< 100 ms`.
- **SC-003:** El pipeline CI en GitHub Actions completa lint + build + unit tests + cobertura en `< 3 minutos` con umbral `>= 80%` configurado.
