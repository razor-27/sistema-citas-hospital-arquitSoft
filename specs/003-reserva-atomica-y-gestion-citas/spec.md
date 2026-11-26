# Especificación de Funcionalidad: Reserva Atómica y Gestión del Ciclo de Vida de Citas

**Rama de Funcionalidad:** `003-reserva-atomica-y-gestion-citas`  
**Creado:** 2026-11-25  
**Estado:** Borrador (Listo para Planificación)  
**Entrada:** Implementar el módulo núcleo `citas` (`src/modulos/citas/`) con reserva atómica anti-doble agendamiento (*zero double-booking*), cancelación/reprogramación, ventanilla con sobrecupos, check-in asistencial y tablero médico.

---

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Reserva atómica de cita con control de concurrencia (HU02 / RF02, RF03) (Prioridad: P1)

Como **paciente registrado**, quiero seleccionar un cupo libre y confirmar mi cita médica, para asegurar mi atención sin riesgo de que otra persona me gane el cupo en el mismo segundo.

**Por qué esta prioridad:** Es el núcleo transaccional del sistema y responde al driver crítico **EQ-04 (Zero Double-Booking)** y **ADR-003**.

**Prueba Independiente:** Enviar 50 peticiones concurrentes `POST /api/v1/citas` sobre el mismo `slotId` y verificar que exactamente 1 retorna `HTTP 201 Created` con código de reserva único y las 49 restantes retornan `HTTP 409 Conflict` en `< 200 ms`.

**Escenarios de Aceptación:**

1. **Dado** un `TurnoSlot` en estado `DISPONIBLE` y un paciente elegible (sin cita activa en la misma especialidad/fecha), **Cuando** el paciente ejecuta `POST /api/v1/citas` con `slotId`, **Entonces** el sistema adquiere el candado en Redis, confirma la transacción en PostgreSQL (`SELECT ... FOR UPDATE`), marca el slot como `RESERVADO`, crea la `Cita` con `CodigoReserva` único, emite `CitaReservadaEvent` y responde `HTTP 201 Created` en `< 800 ms`.
2. **Dado** que dos o más usuarios solicitan simultáneamente el mismo `slotId` (`< 10 ms` de diferencia), **Cuando** compiten por el candado distribuido en Redis (`SET NX PX`), **Entonces** solo la primera solicitud avanza y las demás reciben `HTTP 409 Conflict` en `< 200 ms`, garantizando `0%` de citas duplicadas.
3. **Dado** que un paciente intenta reservar una cita cuando ya tiene otra cita activa en la misma fecha/hora o especialidad, **Cuando** `PoliticaReservaService` evalúa la elegibilidad, **Entonces** rechaza la reserva con `HTTP 422 Unprocessable Entity` y libera el candado de Redis.

---

### Historia de Usuario 2 - Gestión de citas: consulta, cancelación y reprogramación (HU04 / RF04) (Prioridad: P1)

Como **paciente**, quiero visualizar mis citas programadas y poder reprogramar o cancelar una cita con al menos 24 horas de anticipación, para liberar el cupo en beneficio de otro paciente.

**Por qué esta prioridad:** Permite autogestión y recuperación inmediata de cupos ante inasistencias previsibles.

**Prueba Independiente:** Crear una cita con fecha `> 24h` en el futuro, invocar `PATCH /api/v1/citas/:id/cancelar` y verificar que la cita pasa a `CANCELADA`, el `TurnoSlot` vuelve a `DISPONIBLE` y se emite `CitaCanceladaEvent`.

**Escenarios de Aceptación:**

1. **Dado** una cita en estado `RESERVADA` o `CONFIRMADA` con más de 24 horas de anticipación, **Cuando** el paciente la cancela (`PATCH /api/v1/citas/:id/cancelar`) o reprograma (`PATCH /api/v1/citas/:id/reprogramar`), **Entonces** el cupo original se libera inmediatamente a `DISPONIBLE` y se emite el evento correspondiente.
2. **Dado** una cita en estado `ATENDIDA` o con menos de 24 horas de anticipación (para paciente web), **Cuando** el paciente intenta cancelarla, **Entonces** el sistema rechaza la operación con `HTTP 422 Unprocessable Entity` indicando la regla de negocio.

---

### Historia de Usuario 3 - Agendamiento en ventanilla y sobrecupos autorizados (HU05 / RF08) (Prioridad: P2)

Como **personal de admisión**, quiero registrar citas para pacientes presenciales y asignar sobrecupos autorizados por jefatura, para atender a la población sin acceso digital o casos especiales.

**Por qué esta prioridad:** Garantiza inclusión operativa en el hospital sin romper el control de cupos.

**Prueba Independiente:** Autenticarse con rol `ADMISION`, invocar `POST /api/v1/ventanilla/citas/sobrecupo` con justificación y verificar que se respeta el tope diario configurado por especialidad.

**Escenarios de Aceptación:**

1. **Dado** un usuario con rol `ADMISION` autorizado y una especialidad con tope diario de sobrecupos no alcanzado, **Cuando** registra un sobrecupo con justificación válida, **Entonces** la cita se crea marcada como `esSobrecupo: true` con `HTTP 201 Created`.
2. **Dado** que la especialidad ya alcanzó su límite diario de sobrecupos, **Cuando** admisión intenta registrar otro sobrecupo, **Entonces** el sistema rechaza la solicitud con `HTTP 422 Unprocessable Entity`.

---

### Historia de Usuario 4 - Check-in de asistencia y tablero de agenda médica (HU06, HU07 / RF09, RF10) (Prioridad: P2)

Como **paciente/recepción** quiero realizar el check-in entre 45 y 10 minutos antes de la cita, y como **médico** quiero ver mi agenda del día y registrar atenciones o inasistencias (*no-show*), para ordenar la atención del consultorio.

**Por qué esta prioridad:** Cierra el ciclo operativo completo de la cita médica dentro del hospital.

**Prueba Independiente:** Ejecutar `PATCH /api/v1/citas/:id/check-in` dentro de la ventana de 45–10 min previos, verificar transición a `EN_SALA`, y luego `PATCH /api/v1/citas/:id/atender` o `no-asistio` con rol `MEDICO`.

**Escenarios de Aceptación:**

1. **Dado** una cita `RESERVADA` o `CONFIRMADA` cuya hora de inicio está entre 45 y 10 minutos en el futuro, **Cuando** se ejecuta el check-in, **Entonces** el estado cambia a `EN_SALA`.
2. **Dado** un usuario con rol `MEDICO`, **Cuando** consulta `GET /api/v1/citas/agenda-medica?fecha=...`, **Entonces** visualiza sus citas del día ordenadas cronológicamente y puede marcar `ATENDIDA` o `NO_ASISTIO`.

---

### Casos Borde *(Edge Cases)*
- ¿Qué ocurre si el proceso falla después de adquirir el candado en Redis pero antes de confirmar PostgreSQL? El bloque `try/finally` en `ReservarCitaUseCase` **DEBE** liberar el candado (`liberarLock`) usando el token único del solicitante para no liberar el candado de otro proceso si expiró el TTL.
- ¿Qué ocurre si el candado en Redis expira justo antes del `COMMIT` en PostgreSQL? La segunda capa de defensa (`SELECT ... FOR UPDATE` + índice único parcial en `citas (slot_id) WHERE estado != 'CANCELADA'`) en PostgreSQL impide la doble reserva.

---

## Requisitos *(obligatorio)*

### Requisitos Funcionales
- **FR-001 (RF02, RF03):** Reserva atómica con `DistributedLockPort` (`SET NX PX`) + transacción PostgreSQL (`SELECT ... FOR UPDATE`) y código único `CodigoReserva`.
- **FR-002 (RF04):** Consulta de citas propias, cancelación y reprogramación atómica con validación de ventana de 24h y liberación inmediata del slot.
- **FR-003 (RF08):** Endpoint de ventanilla para registro presencial y sobrecupos con justificación y límite por especialidad.
- **FR-004 (RF09):** Check-in habilitado en ventana `[45 min, 10 min]` previos a la cita.
- **FR-005 (RF10):** Consulta de agenda del médico y transiciones de estado (`ATENDIDA`, `NO_ASISTIO`).

### Entidades Clave
- **`Cita` (`Appointment`)**: Estados `RESERVADA`, `CONFIRMADA`, `EN_SALA`, `ATENDIDA`, `CANCELADA`, `NO_ASISTIO`.
- **`CodigoReserva` (VO)**: Código alfanumérico único legible para comprobante.
- **`PoliticaReservaService`**: Servicio de dominio para reglas de elegibilidad y límites.

---

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles
- **SC-001 (EQ-04):** `0%` de citas duplicadas ante 50 peticiones concurrentes al mismo `slotId`; `HTTP 409` en `< 200 ms`.
- **SC-002 (EQ-02):** Tiempo de confirmación de reserva `< 800 ms (p95)`.
- **SC-003:** Cobertura de pruebas unitarias `>= 80%` en `src/modulos/citas/dominio/` y `aplicacion/` ejecutándose en memoria sin BD real.
