# Principios de Diseño (SOLID)

## Objetivo

Documentar cómo se aplican los principios de diseño **SOLID** en el código del **Módulo de Citas Médicas**, garantizando que el sistema sea mantenible, extensible y que sus reglas de negocio permanezcan completamente desacopladas de las tecnologías de persistencia y comunicación externa.

---

## Aplicación de Principios SOLID en el Módulo de Citas

| Principio | Capa Principal | Cómo se cumple en el Sistema | Componentes / Archivos de Ejemplo |
| :--- | :--- | :--- | :--- |
| **S** · Responsabilidad Única (*Single Responsibility*) | Todas las capas | Cada clase tiene un único motivo para cambiar: el controlador HTTP solo mapea protocolos web; el caso de uso solo orquesta el flujo de reserva; la entidad `Cita` solo valida estados clínicos; el repositorio solo escribe SQL. | `CitaController`, `ReservarCitaUseCase`, `Cita`, `PostgresCitaRepository` |
| **O** · Abierto/Cerrado (*Open/Closed*) | Infraestructura y Dominio | El sistema está abierto a la extensión pero cerrado a la modificación. Para agregar un nuevo canal de recordatorios (ej. Telegram o WhatsApp Business API), se añade un nuevo adaptador que implemente `NotificacionPort`, sin tocar el caso de uso ni las entidades. | `TwilioWhatsappAdapter`, `SendGridEmailAdapter` implementando `NotificacionPort` |
| **L** · Sustitución de Liskov (*Liskov Substitution*) | Infraestructura | `PostgresDisponibilidadRepository` y `CachedDisponibilidadRepository` implementan idénticamente el contrato `DisponibilidadPort`. El caso de uso puede trabajar indistintamente con la versión en caché o la directa sin notar diferencias. | `DisponibilidadPort`, `CachedDisponibilidadRepository` |
| **I** · Segregación de Interfaces (*Interface Segregation*) | Dominio (Puertos) | Se evitan interfaces monolíticas o sobrecargadas. En lugar de una interfaz gigante `CitaManagerPort`, se definen interfaces pequeñas y específicas según el caso de uso consumidor. | `CitaRepositoryPort`, `DistributedLockPort`, `EventPublisherPort`, `TurnoSlotPort` |
| **D** · Inversión de Dependencias (*Dependency Inversion*) | Aplicación e Infraestructura | Los módulos de alto nivel (casos de uso) no dependen de módulos de bajo nivel (TypeORM, Redis, Nodemailer). Ambos dependen de abstracciones (interfaces/puertos definidos en el dominio). | `ReservarCitaUseCase` inyecta `CitaRepositoryPort` vía constructor; el contenedor IoC inyecta `PostgresCitaRepository`. |

---

## Comparativa: Impacto de Aplicar SOLID en el Negocio de Citas

| Escenario Operativo Real | Código Sin SOLID (Monolito Acoplado) | Código Con SOLID (Monolito Hexagonal) |
| :--- | :--- | :--- |
| **Se cambia el proveedor de mensajería (SMS tradicional → WhatsApp API)** | Hay que buscar y reescribir código SQL y controladores donde se hacían llamadas `axios.post` directas. Alto riesgo de romper la confirmación de la cita. | Solo se crea la clase `WhatsAppAdapter implements NotificacionPort`. El caso de uso de reserva no se modifica en lo absoluto. |
| **Pico de apertura mensual satura la base de datos** | La consulta de cupos está ligada al controlador mediante consultas SQL directas; no hay forma limpia de colocar Redis sin reescribir todo. | Se envuelve el repositorio con un *Decorator* de Redis (`CachedDisponibilidadRepository`). El caso de uso ni siquiera se entera del cambio. |
| **Cambia la regla hospitalaria de cancelación (de 24h a 12h)** | La validación está dispersa y duplicada en la pantalla web, en el backend y en procedimientos almacenados de base de datos. | La regla vive centralizada en un único lugar: `Cita.validarPuedeCancelar(fechaActual)`. Se prueba unitariamente en 1 milisegundo. |
| **Pruebas de estrés y tests automatizados** | Obligan a tener levantada una base de datos PostgreSQL y conexión activa al SIS; los tests fallan si el SIS externo se cae. | Se ejecutan pruebas unitarias instanciando el caso de uso con `InMemoryCitaRepository` y `MockLockService` en milisegundos con 100% de fiabilidad. |

---

## Relación con la Arquitectura Global

* **S (Responsabilidad Única):** Respalda la división estricta en capas (Presentación, Aplicación, Dominio, Infraestructura) definida en ADR-002 y ADR-008.
* **O & L (Abierto/Cerrado y Liskov):** Facilitan la escalabilidad del sistema permitiendo alternar adaptadores de caché o colas según el entorno (desarrollo local con SQLite/memoria vs. producción con PostgreSQL/Redis).
* **D (Inversión de Dependencias):** Garantiza que el núcleo clínico del hospital sea independiente del proveedor de nube o base de datos.
