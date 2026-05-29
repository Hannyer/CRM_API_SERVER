-- Tabla de roles de usuario (catálogo dinámico)
-- Ejecutar en PostgreSQL / Supabase sobre el esquema ops.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS ops.role (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NULL,
  requires_license boolean NOT NULL DEFAULT false,
  requires_languages boolean NOT NULL DEFAULT false,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_name_unique UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_role_status ON ops.role (status);

COMMENT ON TABLE ops.role IS 'Catálogo de roles de usuario del CRM';
COMMENT ON COLUMN ops.role.name IS 'Nombre único del rol';
COMMENT ON COLUMN ops.role.requires_license IS 'Si true, el usuario con este rol debe tener licenseExpirationDate';

INSERT INTO ops.role (name, description, requires_license, requires_languages, status)
SELECT v.name, v.description, v.requires_license, v.requires_languages, v.status
FROM (VALUES
  ('Administrador', 'Acceso completo al sistema', false, false, true),
  ('Conductor', 'Transporte; requiere licencia vigente', true, false, true),
  ('Recepcionista', 'Atención en recepción y reservas', false, false, true),
  ('Operador', 'Operaciones del día a día', false, false, true),
  ('Guía', 'Guías de actividades turísticas', false, true, true)
) AS v(name, description, requires_license, requires_languages, status)
WHERE NOT EXISTS (
  SELECT 1 FROM ops.role r WHERE r.name = v.name
);

COMMIT;
