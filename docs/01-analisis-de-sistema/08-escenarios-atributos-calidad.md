# Escenarios de Atributos de Calidad

A continuación se formalizan los escenarios de prueba y verificación de atributos de calidad utilizando la plantilla estándar del SEI (Software Engineering Institute).

---

## EQ-01. Disponibilidad: Continuidad del Servicio de Citas (AC01)

| Elemento | Descripción |
| :--- | :--- |
| **Atributo de calidad** | Disponibilidad |
| **Fuente del estímulo** | Paciente, personal de admisión o médico en consultorio |
| **Estímulo** | Intento de búsqueda de disponibilidad, reserva o check-in de cita mientras ocurre la caída imprevista de una instancia del servidor de aplicación. |
| **Entorno / Condición** | Entorno de producción en horario pico habitual, con 3 réplicas del monolito modular activas detrás del balanceador de carga. |
| **Respuesta del sistema** | El balanceador de carga detecta el fallo mediante *health-checks* HTTP en menos de 3 segundos y redirige el tráfico a las instancias sanas restantes. Ninguna sesión de usuario se pierde (las sesiones residen en JWT/Redis). |
| **Medida de respuesta** | Disponibilidad anual **≥ 99.95%**. Tiempo de recuperación y redirección ante fallo de instancia: **< 5 segundos**, con 0% de solicitudes fallidas en reintentos automáticos del cliente. |
| **Estrategia de verificación** | Pruebas de inyección de fallas (*Chaos Testing*) terminando abruptamente un contenedor de la aplicación bajo carga sintética constante. |

---

## EQ-02. Rendimiento: Consulta de Catálogo y Reserva de Citas (AC02)

| Elemento | Descripción |
| :--- | :--- |
| **Atributo de calidad** | Rendimiento y Latencia |
| **Fuente del estímulo** | Paciente navegando en la web o app móvil |
| **Estímulo** | Consulta masiva de horarios libres por especialidad y médico, seguida de la solicitud de confirmación de reserva. |
| **Entorno / Condición** | Carga operativa normal a moderada (~2,000 usuarios concurrentes). |
| **Respuesta del sistema** | Las consultas de disponibilidad se resuelven desde la caché Redis; la reserva se procesa atómicamente en PostgreSQL y se confirma de inmediato. |
| **Medida de respuesta** | Tiempo de respuesta en consulta de disponibilidad: **< 300 ms (p95)** y **< 150 ms (p50)**. Tiempo de confirmación de reserva: **< 800 ms (p95)**. |
| **Estrategia de verificación** | Pruebas de rendimiento con k6 o Locust simulando patrones de navegación realistas (10 consultas por cada 1 reserva). |

---

## EQ-03. Escalabilidad: Pico de Apertura de Agenda Mensual (AC03)

| Elemento | Descripción |
| :--- | :--- |
| **Atributo de calidad** | Escalabilidad |
| **Fuente del estímulo** | Población general de pacientes y familiares (~5,000 concurrentes) |
| **Estímulo** | Ráfaga repentina de tráfico a las 7:00 a.m. coincidiendo con la publicación de cupos médicos del mes siguiente. |
| **Entorno / Condición** | El sistema inicia con 2 réplicas y políticas de autoescalado horizontal (HPA) configuradas por CPU (> 70%) y tasa de solicitudes HTTP. |
| **Respuesta del sistema** | Las réplicas escalan de 2 a 6 instancias en menos de 60 segundos; la caché Redis absorbe el 90% de las lecturas evitando colapso de PostgreSQL; los bloqueos temporales de cupo organizan las reservas sin degradación severa. |
| **Medida de respuesta** | El sistema soporta **5,000 usuarios concurrentes** manteniendo la tasa de error por debajo del **0.1%** y la latencia p95 por debajo de **1.5 segundos** durante la ráfaga de 15 minutos. |
| **Estrategia de verificación** | Prueba de estrés tipo *Spike Test* inyectando un aumento abrupto de 500 a 5,000 usuarios virtuales en un lapso de 2 minutos. |

---

## EQ-04. Consistencia: Prevención Absoluta de Doble Reserva (AC04)

| Elemento | Descripción |
| :--- | :--- |
| **Atributo de calidad** | Consistencia de Datos / Integridad Transaccional |
| **Fuente del estímulo** | Múltiples pacientes (o paciente y admisión en ventanilla) |
| **Estímulo** | Dos o más usuarios intentan reservar exactamente el mismo cupo médico (mismo médico, consultorio, fecha y hora) de forma simultánea (diferencia de < 10 milisegundos). |
| **Entorno / Condición** | Horario de alta demanda con múltiples instancias de la aplicación activas en paralelo. |
| **Respuesta del sistema** | El mecanismo de candado atómico (`Distributed Lock` en Redis o `SELECT ... FOR UPDATE` en PostgreSQL) concede el cupo a la primera solicitud recibida; la segunda solicitud es rechazada ordenadamente indicando que el cupo fue tomado. |
| **Medida de respuesta** | **0% de citas duplicadas (*zero double-booking*)**. Código de estado HTTP 409 Conflict devuelto al usuario concurrente en menos de 200 ms. |
| **Estrategia de verificación** | Test de concurrencia automatizado lanzando 50 peticiones simultáneas sobre el mismo identificador de cupo exacto. |

---

## EQ-05. Seguridad: Protección de Datos y Acceso Autorizado (AC05)

| Elemento | Descripción |
| :--- | :--- |
| **Atributo de calidad** | Seguridad y Privacidad (Ley N.° 29733) |
| **Fuente del estímulo** | Usuario no autenticado, atacante externo o usuario interno sin permisos |
| **Estímulo** | Intento de consultar citas de otro paciente mediante manipulación de parámetros (IDOR), o intento de acceder al panel de apertura de agendas sin rol administrativo. |
| **Entorno / Condición** | Entorno de producción expuesto a internet. |
| **Respuesta del sistema** | El middleware de autorización intercepta la petición, valida la firma del token JWT y los alcances del rol (RBAC), rechaza el acceso con código HTTP 401 o 403 y registra un evento de seguridad en el log de auditoría inmutable. |
| **Medida de respuesta** | **100%** de accesos no autorizados bloqueados; 100% de operaciones de creación/modificación con registro de auditoría (IP, UserID, Timestamp). Cifrado TLS 1.3 forzado en todas las conexiones. |
| **Estrategia de verificación** | Análisis estático de código (SAST) y pruebas de penetración (DAST) automatizadas (OWASP ZAP). |

---

## EQ-06. Tolerancia a Fallos: Resiliencia ante Caída de Pasarelas Externas (AC07)

| Elemento | Descripción |
| :--- | :--- |
| **Atributo de calidad** | Tolerancia a Fallos y Desacoplamiento |
| **Fuente del estímulo** | Plataforma de mensajería (WhatsApp/SMS) o servicio de validación SIS |
| **Estímulo** | La pasarela externa de notificaciones experimenta una caída total o latencias de más de 30 segundos durante el proceso de reserva. |
| **Entorno / Condición** | Paciente confirmando una cita en el portal web. |
| **Respuesta del sistema** | La reserva de la cita se confirma exitosamente en la base de datos y se responde al paciente en pantalla de inmediato. El evento de notificación se encola en RabbitMQ / Redis Streams; el worker detecta el fallo externo, activa el Circuit Breaker y programa reintentos con retraso exponencial sin saturar los recursos del servidor. |
| **Medida de respuesta** | Tiempo de confirmación percibido por el paciente **no se incrementa** (< 800 ms). **0% de citas perdidas o abortadas** por problemas de notificación. |
| **Estrategia de verificación** | Prueba con *mock server* externo inyectando demoras de 60 segundos y fallos HTTP 500 continuos en la API de notificaciones. |
