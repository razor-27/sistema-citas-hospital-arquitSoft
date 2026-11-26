-- Migración 002: Tabla de Citas Médicas (HL7 FHIR Appointment) con protección física anti-doble reserva

CREATE TABLE IF NOT EXISTS citas (
  id UUID PRIMARY KEY,
  codigo_reserva VARCHAR(12) NOT NULL UNIQUE,
  paciente_id UUID NOT NULL,
  slot_id UUID NOT NULL REFERENCES turnos_slots(id),
  medico_id UUID NOT NULL REFERENCES medicos(id),
  especialidad_id UUID NOT NULL REFERENCES especialidades(id),
  fecha_hora_inicio TIMESTAMPTZ NOT NULL,
  estado VARCHAR(20) NOT NULL CHECK (
    estado IN ('RESERVADA', 'CONFIRMADA', 'EN_SALA', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO')
  ),
  es_sobrecupo BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_sobrecupo TEXT,
  motivo_cancelacion TEXT,
  creado_por UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Segunda barrera física anti-doble reserva (EQ-04 / ADR-003)
CREATE UNIQUE INDEX IF NOT EXISTS uq_citas_slot_activo
  ON citas (slot_id)
  WHERE estado NOT IN ('CANCELADA', 'NO_ASISTIO') AND es_sobrecupo = FALSE;

CREATE INDEX IF NOT EXISTS idx_citas_paciente_fecha
  ON citas (paciente_id, fecha_hora_inicio);

CREATE INDEX IF NOT EXISTS idx_citas_medico_fecha
  ON citas (medico_id, fecha_hora_inicio);
