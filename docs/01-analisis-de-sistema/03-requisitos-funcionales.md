# Requisitos Funcionales

## Catálogo de Requisitos Funcionales

| ID | Requisito Funcional | Descripción Detallada |
| :--- | :--- | :--- |
| **RF01** | **Consulta de disponibilidad horaria** | El sistema debe permitir consultar la disponibilidad de cupos médicos filtrando por especialidad, profesional de la salud, fecha, rango horario y sede hospitalaria. |
| **RF02** | **Reserva de cita con bloqueo temporal (Slot Lock)** | El sistema debe permitir seleccionar un cupo libre y bloquearlo temporalmente (por un tiempo configurable, ej. 5 minutos) mientras el usuario completa la reserva, liberándolo automáticamente si no se confirma la transacción. |
| **RF03** | **Confirmación y registro atómico de cita** | El sistema debe registrar formalmente la cita asignando un código único alfanumérico, asociándola al paciente, médico, especialidad, consultorio y fecha/hora, garantizando atomicidad transaccional (cero duplicidad). |
| **RF04** | **Reprogramación y cancelación de cita** | El sistema debe permitir al paciente o al personal de admisión cancelar o reprogramar una cita existente antes del límite de tiempo establecido (ej. 24h antes), liberando inmediatamente el cupo para otros usuarios. |
| **RF05** | **Validación de identidad con RENIEC** | El sistema debe validar en tiempo real los datos del paciente mediante consulta al servicio de RENIEC (DNI, nombres completos, fecha de nacimiento) para pacientes nuevos. |
| **RF06** | **Verificación de cobertura y aseguramiento** | El sistema debe consultar la condición de asegurado del paciente (SIS u otra aseguradora) y registrar la fuente de financiamiento de la cita. |
| **RF07** | **Gestión de cupos y oferta médica** | El sistema debe permitir a la jefatura médica parametrizar la duración de turnos (ej. 15, 20 o 30 minutos), asignar consultorios físicos, cupos máximos por turno y calendarizar la publicación de la agenda mensual. |
| **RF08** | **Gestión de sobrecupos autorizados** | El sistema debe permitir al personal de admisión registrar citas en condición de "sobrecupo" únicamente con la debida justificación y previa autorización configurada en el perfil del usuario. |
| **RF09** | **Check-in de asistencia (Virtual y Presencial)** | El sistema debe permitir al paciente registrar su presencia mediante lectura de código QR en terminales de autoatención o mediante confirmación presencial en ventanilla de admisión dentro de la ventana de tiempo válida. |
| **RF10** | **Tablero y gestión de agenda médica** | El sistema debe proveer al médico un panel con el listado ordenado cronológicamente de sus pacientes citados por turno, indicando el estado en tiempo real (Pendiente, Confirmado en Sala, Atendido, Inasistente). |
| **RF11** | **Envío de notificaciones y recordatorios asíncronos** | El sistema debe enviar comprobantes de reserva, alertas de cambio de horario y recordatorios automáticos (24h y 2h antes) vía WhatsApp, SMS y correo electrónico a través de una cola de mensajería asíncrona. |
| **RF12** | **Gestión de bloqueo de agendas y contingencias** | El sistema debe permitir a los médicos y administradores bloquear franjas horarias por licencias, capacitaciones o feriados, notificando automáticamente a los pacientes afectados para su reprogramación preferencial. |
| **RF13** | **Auditoría inmutable de operaciones de citas** | El sistema debe registrar de forma inmutable todas las operaciones de creación, modificación, cancelación y check-in, almacenando identificador de usuario, dirección IP, fecha/hora y estado anterior y posterior. |
| **RF14** | **Reportes de gestión y demanda de citas** | El sistema debe generar reportes estadísticos sobre tasa de ocupación de consultorios, índice de inasistencias (*no-show*), tiempos promedio de espera y demanda insatisfecha por especialidad. |

---

## Matriz de Trazabilidad: Historias de Usuario vs. Requisitos Funcionales

| Historia de Usuario | Requisitos Funcionales Relacionados |
| :--- | :--- |
| **HU01** Búsqueda de disponibilidad horaria | RF01 |
| **HU02** Reserva de cita con control de concurrencia | RF02, RF03 |
| **HU03** Validación de identidad y seguro | RF05, RF06 |
| **HU04** Gestión de citas (reprogramar / cancelar) | RF04, RF11 |
| **HU05** Agendamiento y gestión en ventanilla | RF01, RF03, RF06, RF08 |
| **HU06** Check-in de asistencia | RF09, RF10 |
| **HU07** Gestión de agenda médica | RF10, RF12 |
| **HU08** Definición de oferta médica y apertura de agendas | RF07, RF12 |
| **HU09** Notificaciones y recordatorios automatizados | RF11 |
| **HU10** Auditoría y trazabilidad integral | RF13, RF14 |
