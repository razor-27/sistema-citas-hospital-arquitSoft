# Especificación de Funcionalidad: Consulta de Disponibilidad y Oferta Médica

**Rama de Funcionalidad:** `002-consulta-disponibilidad-agenda`  
**Creado:** 2026-11-25  
**Estado:** Borrador (Listo para Planificación)  
**Entrada:** Implementar los módulos `medicos` y `agenda` para parametrizar la oferta médica mensual, generar cupos horarios (`TurnoSlot` / HL7 FHIR `Slot`), bloquear franjas por contingencias y consultar disponibilidad con caché Redis (`CachedDisponibilidadDecorator`) e invalidación por eventos.

---

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Búsqueda de disponibilidad horaria (HU01 / RF01) (Prioridad: P1)

Como **paciente o personal de admisión**, quiero buscar citas médicas por especialidad, médico, fecha y turno (mañana/tarde), para encontrar el horario más conveniente sin demoras.

**Por qué esta prioridad:** El 85% del tráfico del hospital (hasta 5,000 concurrentes en apertura de agenda) corresponde a consultas de disponibilidad; requiere baja latencia mediante caché Redis.

**Prueba Independiente:** Poblar una agenda publicada con turnos disponibles y reservados, consultar `GET /api/v1/agenda/disponibilidad?especialidadId=...&fecha=...` y verificar que solo se retornan cupos `DISPONIBLE` en `< 300 ms` (y `< 15 ms` en *Cache Hit* de Redis).

**Escenarios de Aceptación:**

1. **Dado** que existen agendas publicadas para una especialidad y fecha, **Cuando** el usuario consulta `GET /api/v1/agenda/disponibilidad` filtrando por `especialidadId`, `medicoId`, `fecha` y `turno`, **Entonces** el sistema retorna únicamente los cupos en estado `DISPONIBLE` ordenados cronológicamente con tiempo de respuesta `< 300 ms (p95)`.
2. **Dado** que un cupo está `RESERVADO` o `BLOQUEADO`, **Cuando** se consulta la disponibilidad de esa fecha, **Entonces** dicho cupo **no** aparece en la lista de turnos libres.
3. **Dado** que ocurre un *Cache Hit* en Redis para una combinación de filtros, **Cuando** llegan múltiples consultas simultáneas, **Entonces** la respuesta se sirve desde Redis sin consultar PostgreSQL hasta que expire el TTL (60 s) o se emita un evento de invalidación.

---

### Historia de Usuario 2 - Definición de oferta médica y apertura de agendas (HU08 / RF07) (Prioridad: P1)

Como **jefe de consulta externa**, quiero configurar los horarios médicos mensuales, cupos por turno, tiempos de consulta (15, 20 o 30 min) y programar la fecha/hora de apertura pública de la agenda, para distribuir ordenadamente la demanda hospitalaria.

**Por qué esta prioridad:** Es el prerrequisito de datos para que existan cupos (`TurnoSlot`) disponibles para reservar.

**Prueba Independiente:** Autenticarse con rol `ADMIN`, crear una especialidad, médico, consultorio y agenda mensual vía `POST /api/v1/agenda/ofertas`, publicar la agenda y verificar la generación automática de `TurnoSlot` en PostgreSQL.

**Escenarios de Aceptación:**

1. **Dado** un usuario con rol `ADMIN`, **Cuando** registra una oferta médica con duración de turno válida (`15`, `20` o `30` min), consultorio y rango horario, **Entonces** el sistema genera los `TurnoSlot` correspondientes en estado `DISPONIBLE` (o `BORRADOR` hasta su publicación).
2. **Dado** que un médico ya tiene turnos asignados en un rango horario y consultorio, **Cuando** se intenta crear otra oferta que se solapa, **Entonces** el sistema rechaza la operación con `HTTP 409 Conflict` / `422 Unprocessable Entity`.

---

### Historia de Usuario 3 - Bloqueo de agendas por contingencias y feriados (HU07, HU08 / RF12) (Prioridad: P2)

Como **médico o jefe de consulta externa**, quiero bloquear franjas horarias por licencias, capacitaciones o feriados, para evitar nuevas reservas en esos horarios e invalidar la caché inmediatamente.

**Por qué esta prioridad:** Necesario para la operación real del hospital ante ausencias médicas, evitando citas fantasma.

**Prueba Independiente:** Ejecutar `PATCH /api/v1/agenda/slots/bloquear` sobre una franja con rol `MEDICO` o `ADMIN` y comprobar que los cupos pasan a `BLOQUEADO`, la caché Redis se invalida y se emite un evento `AgendaBloqueadaEvent`.

**Escenarios de Aceptación:**

1. **Dado** un conjunto de cupos `DISPONIBLE` en una fecha/rango, **Cuando** un `MEDICO` o `ADMIN` solicita el bloqueo por motivo justificado, **Entonces** los cupos pasan a `BLOQUEADO`, se invalida la llave de caché en Redis y los cupos dejan de mostrarse en disponibilidad.

---

### Casos Borde *(Edge Cases)*
- ¿Qué ocurre si Redis cae temporalmente durante una consulta de disponibilidad? `CachedDisponibilidadDecorator` debe hacer *graceful degradation* consultando directamente `PostgresDisponibilidadRepository` sin devolver error 500 al paciente.
- ¿Qué ocurre si se solicita una fecha pasada en la búsqueda de disponibilidad? El DTO debe rechazar o retornar lista vacía sin contaminar la caché Redis.

---

## Requisitos *(obligatorio)*

### Requisitos Funcionales
- **FR-001 (RF01):** Exponer consulta filtrada de disponibilidad (`especialidadId`, `medicoId`, `fecha`, `turno`, `sedeId`) ocultando cupos bloqueados o reservados.
- **FR-002 (RF07):** Permitir crear especialidades, médicos, consultorios y ofertas de agenda mensual con duración configurable (15, 20, 30 min) y fecha de apertura pública.
- **FR-003 (RF12):** Permitir bloquear franjas horarias por feriados o descansos médicos, emitiendo evento para invalidación de caché y notificación a pacientes afectados.
- **FR-004 (ADR-004):** Implementar el patrón **Decorator** (`CachedDisponibilidadDecorator`) sobre `DisponibilidadPort` con TTL de 60 segundos e invalidación por eventos de dominio.
- **FR-005 (ADR-009):** Modelar `AgendaMedica` y `TurnoSlot` con campos compatibles con HL7 FHIR (`Schedule` y `Slot`).

### Entidades Clave
- **`Especialidad` / `Medico` / `Consultorio`** (`src/modulos/medicos/`): Catálogo asistencial base.
- **`AgendaMedica` (`Schedule`)** (`src/modulos/agenda/`): Programación mensual por médico, consultorio y fecha de apertura.
- **`TurnoSlot` (`Slot`)** (`src/modulos/agenda/`): Unidad mínima reservable (`DISPONIBLE`, `BLOQUEADO_TEMP`, `RESERVADO`, `BLOQUEADO`).

---

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles
- **SC-001 (EQ-02):** Latencia de consulta de disponibilidad `< 300 ms (p95)` y `< 150 ms (p50)` bajo 2,000 usuarios concurrentes; *Cache Hit* en Redis `< 15 ms`.
- **SC-002 (EQ-03):** La caché Redis absorbe `≥ 90%` de las lecturas durante ráfagas de apertura (5,000 VUs, tasa de error `< 0.1%`, p95 `< 1.5 s`).
- **SC-003:** Cobertura de pruebas unitarias `≥ 80%` en `src/modulos/agenda/dominio/` y `aplicacion/`.
