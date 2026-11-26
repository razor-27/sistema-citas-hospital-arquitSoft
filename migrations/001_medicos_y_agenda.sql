-- Migración 001: Catálogo de Médicos, Especialidades, Consultorios y Agendas (HL7 FHIR Schedule/Slot)

CREATE TABLE IF NOT EXISTS especialidades (
  id UUID PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  max_sobrecupos_dia INTEGER NOT NULL DEFAULT 2 CHECK (max_sobrecupos_dia >= 0),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consultorios (
  id UUID PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  piso VARCHAR(20) NOT NULL,
  sede_id VARCHAR(40) NOT NULL DEFAULT 'HUAMANGA-CENTRAL',
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS medicos (
  id UUID PRIMARY KEY,
  cmp VARCHAR(20) NOT NULL UNIQUE,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  especialidad_id UUID NOT NULL REFERENCES especialidades(id),
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_medicos_especialidad
  ON medicos (especialidad_id)
  WHERE activo = TRUE;

CREATE TABLE IF NOT EXISTS agendas_medicas (
  id UUID PRIMARY KEY,
  medico_id UUID NOT NULL REFERENCES medicos(id),
  especialidad_id UUID NOT NULL REFERENCES especialidades(id),
  consultorio_id UUID NOT NULL REFERENCES consultorios(id),
  fecha DATE NOT NULL,
  hora_inicio VARCHAR(5) NOT NULL,
  hora_fin VARCHAR(5) NOT NULL,
  duracion_min SMALLINT NOT NULL CHECK (duracion_min IN (15, 20, 30)),
  fecha_apertura TIMESTAMPTZ NOT NULL,
  publicada BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS turnos_slots (
  id UUID PRIMARY KEY,
  agenda_id UUID NOT NULL REFERENCES agendas_medicas(id) ON DELETE CASCADE,
  medico_id UUID NOT NULL REFERENCES medicos(id),
  especialidad_id UUID NOT NULL REFERENCES especialidades(id),
  consultorio_id UUID NOT NULL REFERENCES consultorios(id),
  sede_id VARCHAR(40) NOT NULL DEFAULT 'HUAMANGA-CENTRAL',
  fecha_hora_inicio TIMESTAMPTZ NOT NULL,
  fecha_hora_fin TIMESTAMPTZ NOT NULL,
  turno VARCHAR(10) NOT NULL CHECK (turno IN ('MANANA', 'TARDE')),
  estado VARCHAR(20) NOT NULL CHECK (estado IN ('DISPONIBLE', 'BLOQUEADO_TEMP', 'RESERVADO', 'BLOQUEADO')),
  motivo_bloqueo TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uq_slots_medico_inicio UNIQUE (medico_id, fecha_hora_inicio)
);

-- Índice parcial para acelerar consultas de disponibilidad (EQ-02 / EQ-03)
CREATE INDEX IF NOT EXISTS idx_slots_disponibilidad
  ON turnos_slots (especialidad_id, fecha_hora_inicio, estado)
  WHERE estado = 'DISPONIBLE';
