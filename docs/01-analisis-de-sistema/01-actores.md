# Actores del Sistema de Citas Médicas

A continuación se identifican los actores humanos y los sistemas externos que interactúan con el **Módulo de Citas Médicas** del hospital.

| **Actor** | **Tipo** | **¿Qué necesita realizar?** |
| :--- | :--- | :--- |
| **Paciente** | Humano (Externo) | Buscar disponibilidad de citas por especialidad y médico; agendar, confirmar, reprogramar y cancelar citas médicas desde el portal web o aplicativo móvil; realizar check-in virtual; recibir confirmaciones y recordatorios por WhatsApp, SMS y correo electrónico. |
| **Personal de Admisión / Ventanilla** | Humano (Interno) | Agendar citas para pacientes presenciales o vía telefónica; registrar pacientes nuevos; verificar vigencia de cobertura de seguro (SIS/Aseguradoras); gestionar excepciones, sobrecupos autorizados y efectuar el check-in presencial en recepción. |
| **Médico Especialista** | Humano (Interno) | Consultar su agenda diaria y semanal de citas; visualizar la lista de pacientes citados; registrar inasistencias o recepcionar al paciente para atención; declarar bloqueos excepcionales de agenda por licencias o emergencias médicas. |
| **Jefe de Consulta Externa / Coordinador** | Humano (Interno) | Definir y publicar la oferta médica mensual; asignar horarios, turnos y consultorios físicos por especialidad médica; establecer reglas de cupos (duración de consulta, cupos web vs. cupos ventanilla); aperturar agendas médicas. |
| **Administrador del Sistema / TI** | Humano (Interno) | Configurar parámetros del sistema, gestionar credenciales, roles y accesos (RBAC); monitorear métricas de concurrencia y salud de colas; consultar registros inmutables de auditoría técnica y funcional. |
| **SIS / Aseguradoras** | Sistema Externo | Suministrar el servicio de validación de acreditación y derechos de cobertura médica del paciente en tiempo real al momento de la reserva. |
| **RENIEC / Registro de Identidad** | Sistema Externo | Validar en línea la autenticidad del Documento Nacional de Identidad (DNI) y los datos filiatorios de pacientes no registrados. |
| **Plataforma de Notificaciones (SMS / WhatsApp / Correo)** | Sistema Externo | Enviar recordatorios automáticos (24h y 2h antes de la cita), códigos de verificación (OTP) y comprobantes de cita agendada o cancelada. |
| **Sistema HIS MINSA / SIHCE** | Sistema Externo | Recibir la información de turnos, citas programadas y reporte diario de atenciones para interoperabilidad y estadísticas sanitarias oficiales. |
