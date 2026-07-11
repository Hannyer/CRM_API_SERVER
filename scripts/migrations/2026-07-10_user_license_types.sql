-- Parametrizacion de roles Guia/Conductor y licencias multiples por usuario.
-- PostgreSQL / Supabase. Ejecutar despues de ops.role, ops.configuration y ops.app_user.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO ops.configuration (
  key01, key02, key03, key04, key05, key06,
  value, description, display_name, status
)
SELECT *
FROM (VALUES
  (
    'PARAMETRO', 'SEGURIDAD', 'USUARIOS', 'ROL', 'GUIA', 'ROLE_ID',
    '9d3372fa-7180-4f04-9727-374e9b513d53',
    'ID del rol Guia usado por reglas de negocio',
    'Rol Guia',
    true
  ),
  (
    'PARAMETRO', 'SEGURIDAD', 'USUARIOS', 'ROL', 'CONDUCTOR', 'ROLE_ID',
    'b07fe1a3-40e2-4cb8-9fd7-ff6df2a2dba3',
    'ID del rol Conductor usado por reglas de negocio',
    'Rol Conductor',
    true
  )
) AS cfg(key01, key02, key03, key04, key05, key06, value, description, display_name, status)
WHERE NOT EXISTS (
  SELECT 1
  FROM ops.configuration c
  WHERE c.key01 = cfg.key01
    AND c.key02 = cfg.key02
    AND c.key03 = cfg.key03
    AND c.key04 = cfg.key04
    AND c.key05 = cfg.key05
    AND c.key06 = cfg.key06
);

CREATE TABLE IF NOT EXISTS ops.license_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT license_type_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT license_type_name_key UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_license_type_status ON ops.license_type(status);

CREATE TABLE IF NOT EXISTS ops.app_user_license (
  app_user_id uuid NOT NULL REFERENCES ops.app_user(id) ON DELETE CASCADE,
  license_type_id uuid NOT NULL REFERENCES ops.license_type(id) ON DELETE RESTRICT,
  expiration_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (app_user_id, license_type_id)
);

CREATE INDEX IF NOT EXISTS idx_app_user_license_user_id ON ops.app_user_license(app_user_id);
CREATE INDEX IF NOT EXISTS idx_app_user_license_type_id ON ops.app_user_license(license_type_id);
CREATE INDEX IF NOT EXISTS idx_app_user_license_expiration_date ON ops.app_user_license(expiration_date);

CREATE OR REPLACE FUNCTION ops.update_app_user_license_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_user_license_updated_at ON ops.app_user_license;
CREATE TRIGGER trg_app_user_license_updated_at
  BEFORE UPDATE ON ops.app_user_license
  FOR EACH ROW
  EXECUTE FUNCTION ops.update_app_user_license_updated_at();

INSERT INTO ops.license_type (name, status)
VALUES
  ('Licencia guia local', true),
  ('Licencia guia general', true),
  ('Licencia especializada en naturalismo', true),
  ('Licencia especializada en canyoning', true),
  ('Licencia especializada en cables y cuerdas', true),
  ('Licencia especializada en cabalgatas', true),
  ('Licencia especializada en rafting', true),
  ('Licencia especializada en aguas planas', true),
  ('Curso de primeros auxilios y RCP', true),
  ('Licencia de conducir', true)
ON CONFLICT (name) DO UPDATE SET
  status = true,
  updated_at = now();

-- Migracion opcional desde el campo anterior hacia Licencia de conducir.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'ops'
      AND table_name = 'app_user'
      AND column_name = 'license_expiration_date'
  ) THEN
    INSERT INTO ops.app_user_license (app_user_id, license_type_id, expiration_date)
    SELECT u.id, lt.id, u.license_expiration_date
    FROM ops.app_user u
    CROSS JOIN ops.license_type lt
    WHERE lt.name = 'Licencia de conducir'
      AND u.license_expiration_date IS NOT NULL
    ON CONFLICT (app_user_id, license_type_id) DO UPDATE SET
      expiration_date = EXCLUDED.expiration_date,
      updated_at = now();
  END IF;
END $$;

ALTER TABLE ops.app_user
  DROP COLUMN IF EXISTS license_expiration_date;

COMMIT;
