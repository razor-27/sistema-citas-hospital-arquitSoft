# Especificación de Funcionalidad: Seguridad, Integraciones Resilientes, Auditoría y Pruebas de Calidad

**Rama de Funcionalidad:** `004-integraciones-seguridad-y-calidad`  
**Creado:** 2026-11-25  
**Estado:** Borrador (Listo para Planificación)  
**Entrada:** Implementar los módulos `auth`, `pacientes` (RENIEC/SIS con Circuit Breaker), `notificaciones` (RabbitMQ + DLQ), `auditoria` (log inmutable + reportes) y la suite de pruebas de atributos de calidad con Postman/Newman y k6 (EQ-01 a EQ-06).

---

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Autenticación JWT, RBAC y Auditoría Inmutable (HU10 / RF13, EQ-05) (Prioridad: P1)

Como **administrador del sistema / oficial de seguridad**, quiero que toda petición protegida valide JWT y roles (RBAC), bloquee accesos IDOR y registre de forma inmutable cada operación sobre citas (usuario, IP, timestamp, estado anterior/posterior), para cumplir la Ley N.° 29733 y resolver disputas.

**Por qué esta prioridad:** Protege datos sensibles de salud (Ley N.° 29733) y habilita el control de acceso sobre todos los endpoints de las specs `002` y `003`.

**Prueba Independiente:** Intentar consultar la cita de otro paciente (`GET /api/v1/citas/:id`) o crear una oferta médica con rol `PACIENTE` y verificar respuesta `HTTP 403 Forbidden` más registro en `auditoria_eventos`.

**Escenarios de Aceptación:**

1. **Dado** un usuario autenticado con rol `PACIENTE`, **Cuando** intenta consultar o cancelar una cita perteneciente a otro `pacienteId` (IDOR) o acceder a `/api/v1/agenda/ofertas`, **Entonces** el sistema rechaza con `HTTP 403 Forbidden` y registra el intento.
2. **Dado** un usuario no autenticado, **Cuando** invoca un endpoint protegido, **Entonces** recibe `HTTP 401 Unauthorized`.
3. **Dado** cualquier creación, modificación, cancelación o check-in exitoso de cita, **Cuando** finaliza la operación, **Entonces** se inserta un registro *append-only* en `auditoria_eventos` consultable por DNI, historia clínica o código de reserva.

---

### Historia de Usuario 2 - Validación RENIEC/SIS con Circuit Breaker (HU03 / RF05, RF06, EQ-06) (Prioridad: P2)

Como **paciente o personal de admisión**, quiero validar el DNI contra RENIEC y la cobertura del SIS al registrar o agendar, sin que una caída o lentitud de las pasarelas externas bloquee la reserva, para garantizar continuidad operativa en ventanilla y web.

**Por qué esta prioridad:** Cumple el escenario de tolerancia a fallos **EQ-06** y **ADR-010**.

**Prueba Independiente:** Apuntar el adaptador SIS/RENIEC a un *mock server* con demora de 60 s o errores `HTTP 500` continuos, realizar una reserva y verificar que el Circuit Breaker abre el circuito, aplica *fallback* (`PENDIENTE_VALIDACION`) y la reserva responde en `< 800 ms`.

**Escenarios de Aceptación:**

1. **Dado** un DNI válido y servicios RENIEC/SIS operativos, **Cuando** admisión busca o registra al paciente (`POST /api/v1/pacientes/validar-identidad`), **Entonces** el sistema autocompleta nombres y registra la cobertura (`SIS` / `PARTICULAR`).
2. **Dado** que la API de SIS/RENIEC responde con timeout o `HTTP 500` repetido, **Cuando** el Circuit Breaker (*Opossum*) se abre, **Entonces** el sistema aplica *fallback* inmediato sin abortar la reserva ni degradar la latencia (`< 800 ms`).

---

### Historia de Usuario 3 - Notificaciones Asíncronas por RabbitMQ + DLQ (HU09 / RF11, EQ-06) (Prioridad: P2)

Como **paciente**, quiero recibir confirmación y recordatorios (24h y 2h antes) por WhatsApp/SMS/correo de forma asíncrona, para no olvidar mi cita sin retrasar la respuesta de reserva.

**Por qué esta prioridad:** Desacopla integraciones lentas (500 ms–3 s) del flujo crítico de reserva (ADR-005).

**Prueba Independiente:** Confirmar una cita, verificar que `CitaReservadaEvent` se publica en RabbitMQ, el worker invoca `WhatsAppCloudAdapter` y ante fallo simulado reintenta con backoff exponencial hasta DLQ sin afectar el `201 Created` inicial.

**Escenarios de Aceptación:**

1. **Dado** que se confirma o cancela una cita, **Cuando** se publica el evento en RabbitMQ, **Entonces** la respuesta HTTP al usuario no espera al envío externo y el worker procesa la plantilla en segundo plano.
2. **Dado** que la pasarela de WhatsApp retorna `HTTP 500`, **Cuando** el worker intenta despachar el mensaje, **Entonces** reintenta con retraso exponencial y envía a la cola DLQ tras agotar intentos (`0%` de pérdida de eventos).

---

### Historia de Usuario 4 - Reportes de Gestión y Verificación de Escenarios de Calidad (HU10 / RF14, EQ-01..EQ-06) (Prioridad: P1)

Como **equipo de QA / jefatura**, quiero ejecutar colecciones Postman/Newman y scripts k6 contra la API desplegada, para verificar formalmente los 6 escenarios de atributos de calidad (EQ-01 a EQ-06) y consultar reportes de ocupación e inasistencia.

**Por qué esta prioridad:** Cierra el ciclo de validación empírica de la arquitectura planteada.

**Prueba Independiente:** Ejecutar `newman run tests/postman/citas-hospital.collection.json` y `k6 run tests/k6/eq04-concurrencia.js` contra el entorno Docker Compose.

**Escenarios de Aceptación:**

1. **Dado** el entorno Docker Compose activo, **Cuando** se ejecuta la colección Postman/Newman, **Entonces** el 100% de aserciones de contratos REST, JWT, RBAC y anti-IDOR (EQ-05) pasan.
2. **Dado** los scripts k6 para EQ-02 (2,000 VUs, 10 lecturas : 1 reserva), EQ-03 (Spike 500→5,000 VUs) y EQ-04 (50 peticiones simultáneas al mismo `slotId`), **Cuando** se ejecutan, **Entonces** se validan los umbrales de latencia (`p95 < 300 ms` lectura, `< 800 ms` reserva), tasa de error (`< 0.1%`) y `0%` doble reserva.

---

## Requisitos *(obligatorio)*

### Requisitos Funcionales
- **FR-001 (ADR-008):** Autenticación JWT (RS256/HS256) + Guards RBAC (`PACIENTE`, `ADMISION`, `MEDICO`, `ADMIN`) en `src/modulos/auth/`.
- **FR-002 (RF05, RF06):** Módulo `pacientes` con `ReniecAdapter` y `SISResilientAdapter` protegidos con Circuit Breaker (*Opossum*).
- **FR-003 (RF11):** Módulo `notificaciones` con consumidor RabbitMQ, reintentos exponenciales, DLQ y `WhatsAppCloudAdapter` / `TwilioSmsAdapter`.
- **FR-004 (RF13, RF14):** Módulo `auditoria` *append-only* y endpoint de reportes estadísticos (`GET /api/v1/auditoria/reportes/ocupacion`).
- **FR-005 (EQ-01..EQ-06):** Colección Postman/Newman + Scripts k6 para rendimiento, spike, concurrencia y tolerancia a fallos.

---

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles
- **SC-001 (EQ-05):** `100%` de pruebas RBAC e IDOR bloqueadas (`401`/`403`) en Postman/Newman; `100%` de mutaciones registradas en `auditoria_eventos`.
- **SC-002 (EQ-06):** `0%` de citas abortadas o perdidas cuando el mock de SIS/WhatsApp inyecta `60 s` de latencia o `HTTP 500`.
- **SC-003 (EQ-02, EQ-03, EQ-04):** Reportes k6 cumplen `p95 < 300 ms` en disponibilidad, `0` dobles reservas en test de concurrencia y `< 0.1%` errores en spike.
