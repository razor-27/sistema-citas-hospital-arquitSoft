# Patrones de Diseño

## Objetivo

Documentar los patrones de diseño aplicados en el **Módulo de Citas Médicas**, especificando en qué capa se aplican, qué problema concreto resuelven y qué componentes de código los implementan, garantizando un desarrollo estandarizado y de alta calidad.

---

## Patrones Aplicados en el Sistema

| Patrón | Dónde se usa | Problema que resuelve | Implementación técnica | Elementos del diseño |
| :--- | :--- | :--- | :--- | :--- |
| **Adapter (Puertos y Adaptadores)** | Capa de Infraestructura (`modulos/*/infraestructura/`) | Aislar la lógica de dominio de las librerías concretas de bases de datos, pasarelas de mensajería y servicios externos. | TypeScript `implements Interface` | `PostgresCitaRepository implements CitaRepositoryPort`, `TwilioSmsAdapter implements NotificacionPort` |
| **Repository** | Casos de uso de citas y agenda | Abstraer el acceso a datos. El caso de uso no construye consultas SQL ni conoce el ORM. | TypeORM / Prisma / Kysely en adaptadores | `CitaRepositoryPort`, `PostgresCitaRepository` |
| **Distributed Lock / Mutex (Redlock)** | Caso de uso de reserva (`ReservarCitaUseCase`) | Prevenir la condición de carrera (*race condition*) cuando cientos de usuarios intentan reservar el mismo cupo a las 7:00 a.m. | Claves atómicas en Redis con comando `SET NX PX` | `DistributedLockPort`, `RedisDistributedLockAdapter` |
| **Decorator** | Consulta de disponibilidad horaria | Consultar horarios libres a alta velocidad en memoria sin saturar la base de datos PostgreSQL. | Patrón Decorator sobre el repositorio de turnos | `CachedDisponibilidadRepository` envolviendo a `PostgresDisponibilidadRepository` |
| **Domain Events / Publish-Subscribe** | Módulo de Citas → Módulo de Notificaciones y Auditoría | Desacoplar la confirmación de la cita del envío de mensajes (SMS, WhatsApp, email) y del registro de auditoría. | `EventEmitter2` en memoria o RabbitMQ | `CitaReservadaEvent`, `NotificacionesListener` |
| **Circuit Breaker** | Adaptadores hacia servicios externos (SIS, RENIEC, WhatsApp API) | Si el servicio gubernamental del SIS o RENIEC se ralentiza o cae, evitar agotar los hilos del servidor hospitalario. | Librería *Opossum* o políticas de resiliencia | `SisCircuitBreakerAdapter` |
| **Value Object (Objeto de Valor)** | Capa de Dominio | Evitar la obsesión por tipos primitivos y encapsular validaciones de inmutabilidad en fechas, estados y rangos horarios. | Clases inmutables con validación en constructor | `HorarioConsulta`, `EstadoCita`, `CodigoReserva` |
| **Unit of Work / Transaction Script** | Casos de uso de reserva y reprogramación | Asegurar que la actualización del estado del cupo (*slot*) y la creación del registro de cita ocurran dentro de una misma transacción ACID. | `DataSource.transaction()` de base de datos | `TransactionManagerPort`, `PostgresTransactionManager` |

---

## Detalle de Operación de los Patrones Clave

### 1. Patrón Distributed Lock (Prevención de Doble Reserva)
* **Mecanismo:** Cuando un usuario inicia la reserva del `slotId: 4580`, la aplicación solicita un candado en Redis: `SET lock:slot:4580 <token> NX PX 10000`.
* **Resultado:** Si otro usuario envía la solicitud en el mismo milisegundo, Redis responde `NIL` (candado no adquirido), el sistema retorna inmediatamente `HTTP 409 Conflict ("Cupo en proceso de reserva")` sin saturar PostgreSQL ni permitir reservas duplicadas.

### 2. Patrón Decorator para Caché de Disponibilidad
* **Mecanismo:** La interfaz `DisponibilidadPort` tiene dos implementaciones. `CachedDisponibilidadRepository` consulta primero la clave `agenda:medico:123:fecha:2026-11-15` en Redis:
  - Si hay *Cache Hit* (90% de los casos en ráfagas), retorna el JSON en < 15 ms.
  - Si hay *Cache Miss*, delega la consulta a `PostgresDisponibilidadRepository`, guarda el resultado en Redis con TTL de 60 segundos y retorna la respuesta.

### 3. Patrón Circuit Breaker en Adaptadores Externos
* **Mecanismo:** Si la llamada al servicio de validación de seguro del SIS falla consecutivamente 5 veces o supera un timeout de 2 segundos, el circuito se abre (*OPEN*).
* **Resultado:** Las siguientes solicitudes no intentan conectar al SIS (evitando cuellos de botella); en su lugar, la cita se registra en estado condicional *"Pendiente de Acreditación SIS"* para ser regularizada en ventanilla, permitiendo al paciente asegurar su fecha de atención.

---

## Beneficios Arquitectónicos

- **Cero acoplamiento tecnológico:** Es posible reemplazar PostgreSQL por otra base de datos relacional o cambiar el proveedor de SMS/WhatsApp sin modificar una sola línea de las reglas de agendamiento.
- **Rendimiento predecible:** Redis y el patrón Decorator absorben las ráfagas de lectura, y el Distributed Lock elimina la incertidumbre de condiciones de carrera.
- **Testabilidad aislada:** El 100% de los casos de uso y reglas de dominio pueden probarse mediante pruebas unitarias puras con mocks en memoria, sin necesidad de conectarse a bases de datos ni internet.
