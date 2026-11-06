# Sistema Escalable de Citas Médicas - Hospital de Huamanga

## Descripción

Propuesta de arquitectura y diseño de software para el **Sistema de Citas Médicas**, diseñado específicamente para resolver la alta concurrencia, la prevención estricta de doble reserva (*zero double-booking*) y la escalabilidad horizontal en periodos críticos de apertura mensual de agendas médicas (hasta ~5,000 usuarios concurrentes en ráfagas matutinas).

El sistema adopta el estilo de **Monolito Modular con Clean Architecture y Arquitectura Hexagonal (Puertos y Adaptadores)**, complementado con **Caché en Memoria y Bloqueo Distribuido en Redis** y **Mensajería Asíncrona mediante Colas RabbitMQ**, garantizando alta disponibilidad (99.95%), latencias inferiores a 300 ms en consultas y total desacoplamiento de integraciones externas (RENIEC, SIS, WhatsApp/SMS).

## Caso de Estudio

Hospital de Huamanga (Ayacucho, Perú).

---

## Contenido de la Documentación

### 1. Análisis de Sistema
1. [Actores](docs/01-analisis-de-sistema/01-actores.md): Identificación de usuarios humanos (paciente, admisión, médico, jefatura/TI) y sistemas externos (RENIEC, SIS, WhatsApp, HIS MINSA).
2. [Historias de Usuario](docs/01-analisis-de-sistema/02-historias-del-usuario.md): Historias de usuario HU01 a HU10 con criterios de aceptación.
3. [Requisitos Funcionales](docs/01-analisis-de-sistema/03-requisitos-funcionales.md): Catálogo RF01 a RF14 y matriz de trazabilidad con HU.
4. [Atributos de Calidad y Carga](docs/01-analisis-de-sistema/04-atributos-de-calidad.md): AC01 a AC07, estimación de usuarios registrados (~24,000) y picos de apertura (5,000 concurrentes).
5. [Restricciones](docs/01-analisis-de-sistema/05-restricciones.md): Normativa peruana Ley N.° 29733, estándar HL7 FHIR, portabilidad y omnicanalidad.
6. [Drivers Arquitectónicos](docs/01-analisis-de-sistema/06-driver-arquitectonicos.md): DA01 a DA08 y justificación de impacto arquitectónico.
7. [Decisiones Arquitectónicas (ADR)](docs/01-analisis-de-sistema/07-decisiones-arquitectonicas.md): Registro de decisiones ADR-001 a ADR-010 (Monolito modular, locking distribuido, caché e inversión de dependencias).
8. [Escenarios de Atributos de Calidad](docs/01-analisis-de-sistema/08-escenarios-atributos-calidad.md): Escenarios formales SEI (EQ-01 a EQ-06).

### 2. Arquitectura de Software
- [Arquitectura Inicial](docs/02-arquitectura-software/arquitectura-inicial.md): Visión global por capas (Presentación, Balanceo, Monolito Modular, Persistencia y Sistemas Externos).
- [Componentes Arquitectónicos](docs/02-arquitectura-software/componentes-arquitectonicos.md): Componentes de Clean Architecture, puertos de entrada/salida y flujo de control.
- [Estilo Arquitectónico](docs/02-arquitectura-software/estilo-arquitectonico.md): Arquitectura monolítica en capas, despliegue horizontal *stateless*, failover y metas RTO/RPO.
- [Enfoque Arquitectónico](docs/02-arquitectura-software/enfoque-arquitectonico.md): Clean Architecture y Puertos y Adaptadores aplicados al núcleo de citas.

### 3. Diseño de Software
- [Diseño Interno de Módulos](docs/03-diseño-de-software/diseño-interno/diseño-interno-de-modulos.md): Organización física de carpetas TypeScript/NestJS, diagramas de paquetes, clases, secuencia y código del caso de uso principal.
- [Patrones de Diseño](docs/03-diseño-de-software/diseño-interno/patrones-de-diseño.md): Adapter (SIS/WhatsApp), Repository, Distributed Lock (Redlock), Decorator (Caché), Domain Events y Circuit Breaker.
- [Principios de Diseño (SOLID)](docs/03-diseño-de-software/diseño-interno/principios-de-diseño.md): Aplicación rigurosa de SOLID e Inversión de Dependencias (DIP) en el dominio de citas médicas.

### 4. Modelo C4
- [Nivel 1 · Diagrama de Contexto del Sistema](docs/04-modelo-c4/Nivel1-DiagramadeContextodelSistema.md): El sistema como una caja negra, actores y sistemas integrados.
- [Nivel 2 · Diagrama de Contenedores](docs/04-modelo-c4/Nivel2-DiagramadeContenedores.md): Aplicaciones web/móvil, balanceador, API monolito, PostgreSQL, Redis y broker de colas.
- [Nivel 3 · Diagrama de Componentes](docs/04-modelo-c4/Nivel3-Diagrama-de-Componentes.md): Módulos internos del monolito modular y sus relaciones con BD, caché y sistemas externos.
- [Nivel 4 · Diagrama de Código](docs/04-modelo-c4/Nivel4-DiagramadeCodigo.md): Diagrama UML de clases y secuencia detallada del flujo de reserva atómica con distributed lock.

---

