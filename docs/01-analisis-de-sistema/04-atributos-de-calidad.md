# Atributos de Calidad y Estimación de Carga

## Atributos de Calidad

| ID | Atributo de Calidad | Escenario de Calidad |
| :--- | :--- | :--- |
| **AC01** | **Disponibilidad** | El sistema de citas debe operar con una disponibilidad anual del **99.95%** (equivalente a un tiempo de inactividad no planificado menor a 4.38 horas al año), manteniendo disponibilidad total durante los periodos críticos de apertura de agenda mensual. |
| **AC02** | **Rendimiento (Latencia)** | La consulta del catálogo de disponibilidad de citas debe responder en **menos de 300 ms** (percentil 95), y la operación transaccional de reserva y confirmación de cita en **menos de 800 ms** (percentil 95), incluso bajo el escenario de carga pico de apertura de agenda. |
| **AC03** | **Escalabilidad y Concurrencia** | El sistema debe ser capaz de absorber ráfagas masivas de hasta **5,000 usuarios concurrentes activos** compitiendo por cupos médicos durante la apertura de agenda matutina (7:00 a.m.) y escalar horizontalmente sin degradar el rendimiento por encima de los límites fijados en AC02. |
| **AC04** | **Consistencia e Integridad Transaccional** | El sistema debe garantizar **cero sobreventa de citas (*no double-booking*)** bajo condiciones de carrera extrema al milisegundo mediante bloqueos atómicos o concurrencia optimista, asegurando consistencia estricta en el estado de cada cupo médico. |
| **AC05** | **Seguridad y Privacidad** | Toda la comunicación debe viajar cifrada con TLS 1.3 y los datos sensibles en reposo con AES-256. El acceso debe regirse por control de acceso basado en roles (RBAC), autenticación mediante tokens JWT firmados criptográficamente, auditoría inmutable de reservas y cumplimiento estricto de la Ley N.° 29733 (Protección de Datos Personales en Perú). |
| **AC06** | **Mantenibilidad y Modularidad** | La base de código debe estar organizada como un **Monolito Modular con Arquitectura Hexagonal**. Cada módulo (`citas`, `agenda`, `pacientes`, `notificaciones`) debe poseer límites de dominio definidos, permitiendo que cualquiera de ellos pueda evolucionar, probarse aisladamente o extraerse como microservicio en el futuro sin reescribir la lógica central. |
| **AC07** | **Tolerancia a Fallos y Desacoplamiento Asíncrono** | Fallas o lentitud en servicios externos (envío de WhatsApp/SMS, consulta a RENIEC o SIS) **no deben bloquear ni abortar la confirmación de la cita**. Dichas tareas deben ser absorbidas asíncronamente por colas de mensajería con reintentos automáticos y cola de mensajes fallidos (*Dead Letter Queue* - DLQ). |

---

## Estimación de Carga y Usuarios

### Población de Usuarios

| Segmento de Usuario | Cantidad Estimada | % del Total | Rol en el Sistema |
| :--- | :--- | :--- | :--- |
| **Pacientes con cuenta activa (Portal / App)** | 22,000 | 91.6% | Búsqueda, agendamiento web, reprogramación y check-in |
| **Médicos Especialistas** | 350 | 1.5% | Consulta de agenda diaria, control de asistencia |
| **Personal de Admisión / Ventanilla** | 120 | 0.5% | Agendamiento presencial/telefónico, validación y cobro/SIS |
| **Jefes de Consulta Externa / Coordinadores** | 30 | 0.1% | Programación de rol médico mensual y apertura de agendas |
| **Personal de TI / Auditoría** | 10 | 0.04% | Monitoreo técnico, soporte y parametrización |
| **Acompañantes / Familiares (vía portal paciente)** | 1,500 | 6.25% | Agendamiento a nombre de menores o adultos mayores |
| **TOTAL DE USUARIOS REGISTRADOS** | **24,010** | **100%** | Base de dimensionamiento general |

---

### Escenarios de Concurrencia Operativa

| Escenario | Usuarios Concurrentes | % de la Base | Contexto Operativo y Comportamiento |
| :--- | :--- | :--- | :--- |
| **Operación valle / nocturna** | ~200 – 400 | ~1.5% | Consultas diferidas en madrugada o fines de semana |
| **Operación diaria regular (8:00 – 16:00 h)** | ~1,500 – 2,000 | ~8% | Flujo constante de agendamiento y confirmaciones en ventanilla y web |
| **Pico diario de apertura de agenda (7:00 – 7:30 a. m.)** | **~5,000** | **~21%** | Ráfaga intensa de 15 a 30 minutos donde pacientes intentan reservar cupos recién liberados |
| **Pico extraordinario de contingencia (Peor caso)** | **hasta ~8,000** | **~33%** | Apertura simultánea de especialidades de alta demanda o campañas sanitarias masivas |

---

### Estimación de Rendimiento de Base de Datos y Caché

* **Ratio Lecturas vs. Escrituras:** 85% Lecturas (búsqueda de especialidades, fechas, médicos y horarios libres) frente a 15% Escrituras (bloqueos temporales de cupo, confirmación de reserva, cancelaciones).
* **Estrategia ante el pico:** Las consultas de disponibilidad son absorbidas por el clúster de caché en Redis (con TTL de 30 a 60 segundos o invalidación reactiva por evento de reserva), evitando saturar el motor relacional de persistencia PostgreSQL durante la ráfaga de las 7:00 a.m.
