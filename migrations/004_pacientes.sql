-- Migration 004: Pacientes
-- Generado automáticamente — no modificar manualmente

BEGIN;

CREATE TABLE IF NOT EXISTS pacientes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID        REFERENCES usuarios(id) ON DELETE RESTRICT,
  dni              VARCHAR(8)  NOT NULL UNIQUE,
  nombres          VARCHAR(100) NOT NULL,
  apellidos        VARCHAR(100) NOT NULL,
  fecha_nacimiento DATE,
  telefono         VARCHAR(20),
  email            VARCHAR(255),
  cobertura        VARCHAR(20) NOT NULL DEFAULT 'PARTICULAR'
                               CHECK (cobertura IN ('SIS','PARTICULAR','ESSALUD','OTRO')),
  validacion_reniec BOOLEAN    NOT NULL DEFAULT FALSE,
  activo           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pacientes_dni       ON pacientes (dni);
CREATE INDEX IF NOT EXISTS idx_pacientes_usuario_id ON pacientes (usuario_id) WHERE usuario_id IS NOT NULL;

COMMIT;
