-- Migration 003: Usuarios y Auditoría Inmutable
-- Generado automáticamente — no modificar manualmente

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla de usuarios del sistema (autenticación y autorización)
CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dni           VARCHAR(8)  NOT NULL UNIQUE,
  email         VARCHAR(255),
  password_hash TEXT        NOT NULL,
  rol           VARCHAR(20) NOT NULL CHECK (rol IN ('PACIENTE','ADMISION','MEDICO','ADMIN')),
  activo        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_dni ON usuarios (dni);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email) WHERE email IS NOT NULL;

-- Tabla de auditoría inmutable (append-only — sin UPDATE ni DELETE)
CREATE TABLE IF NOT EXISTS auditoria_eventos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cita_id         UUID,
  codigo_reserva  VARCHAR(20),
  usuario_id      UUID,
  usuario_dni     VARCHAR(8),
  ip              INET,
  operacion       VARCHAR(50) NOT NULL,
  estado_anterior VARCHAR(30),
  estado_nuevo    VARCHAR(30),
  metadata        JSONB       NOT NULL DEFAULT '{}',
  ocurrido_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_cita_id        ON auditoria_eventos (cita_id)        WHERE cita_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_dni    ON auditoria_eventos (usuario_dni)     WHERE usuario_dni IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auditoria_codigo_reserva ON auditoria_eventos (codigo_reserva)  WHERE codigo_reserva IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auditoria_operacion      ON auditoria_eventos (operacion);
CREATE INDEX IF NOT EXISTS idx_auditoria_ocurrido_en    ON auditoria_eventos (ocurrido_en DESC);

-- Regla de protección append-only
CREATE RULE auditoria_no_update AS ON UPDATE TO auditoria_eventos DO INSTEAD NOTHING;
CREATE RULE auditoria_no_delete AS ON DELETE TO auditoria_eventos DO INSTEAD NOTHING;

COMMIT;
