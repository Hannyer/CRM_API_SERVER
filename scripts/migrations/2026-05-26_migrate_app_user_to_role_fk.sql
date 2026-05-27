-- Migra ops.app_user.role (enum) → ops.app_user.role_id (FK a ops.role)
-- Requisito: ejecutar antes scripts/create_roles_table.sql
-- Opcional: después de validar datos, eliminar el tipo enum ops.app_user_role

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Asegurar tabla de roles y datos base
CREATE TABLE IF NOT EXISTS ops.role (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text NULL,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_code_unique UNIQUE (code),
  CONSTRAINT role_code_format CHECK (code ~ '^[a-z][a-z0-9_]*$')
);

INSERT INTO ops.role (code, name, description, status)
VALUES
  ('admin', 'Administrador', 'Acceso completo al sistema', true),
  ('driver', 'Conductor', 'Transporte; requiere licencia vigente', true),
  ('receptionist', 'Recepcionista', 'Atención en recepción y reservas', true),
  ('operator', 'Operador', 'Operaciones del día a día', true),
  ('guide', 'Guía', 'Guías de actividades turísticas', true)
ON CONFLICT (code) DO NOTHING;

-- 2) Columna FK en app_user
ALTER TABLE ops.app_user
  ADD COLUMN IF NOT EXISTS role_id uuid NULL;

-- 3) Poblar role_id desde enum/texto existente
UPDATE ops.app_user u
SET role_id = r.id
FROM ops.role r
WHERE u.role_id IS NULL
  AND lower(trim(u.role::text)) = r.code;

-- Usuarios sin match: asignar operator por defecto
UPDATE ops.app_user u
SET role_id = r.id
FROM ops.role r
WHERE u.role_id IS NULL
  AND r.code = 'operator';

-- 4) NOT NULL + FK
ALTER TABLE ops.app_user
  ALTER COLUMN role_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_user_role_id_fk'
  ) THEN
    ALTER TABLE ops.app_user
      ADD CONSTRAINT app_user_role_id_fk
      FOREIGN KEY (role_id) REFERENCES ops.role(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_app_user_role_id ON ops.app_user (role_id);

-- 5) Eliminar columna enum antigua
ALTER TABLE ops.app_user DROP COLUMN IF EXISTS role;

COMMENT ON COLUMN ops.app_user.role_id IS 'FK a ops.role';

COMMIT;

-- Ejecutar manualmente si ya no hay dependencias del enum:
-- DROP TYPE IF EXISTS ops.app_user_role;
