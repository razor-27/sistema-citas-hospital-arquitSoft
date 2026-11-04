# Sistema Escalable de Citas Médicas - Hospital de Huamanga

## Descripción

Propuesta de arquitectura y diseño de software para el **Sistema de Citas Médicas**, diseñado específicamente para resolver la alta concurrencia, la prevención estricta de doble reserva (*zero double-booking*) y la escalabilidad horizontal en periodos críticos de apertura mensual de agendas médicas (hasta ~5,000 usuarios concurrentes en ráfagas matutinas).

El sistema adopta el estilo de **Monolito Modular con Arquitectura Hexagonal (Puertos y Adaptadores)**, complementado con **Caché en Memoria y Bloqueo Distribuido en Redis** y **Mensajería Asíncrona mediante Colas de Eventos**, garantizando alta disponibilidad (99.95%), latencias inferiores a 300 ms en consultas y total desacoplamiento de integraciones externas (RENIEC, SIS, WhatsApp/SMS).

