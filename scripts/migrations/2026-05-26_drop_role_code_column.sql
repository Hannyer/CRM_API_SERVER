-- Elimina ops.role.code; los usuarios se relacionan por role_id (UUID).
-- Ejecutar en DBeaver sobre la base que ya tiene ops.role con columna code.

BEGIN;

-- 1) Columna para regla de licencia (reemplaza validación por code = driver)
ALTER TABLE ops.role
  ADD COLUMN IF NOT EXISTS requires_license boolean NOT NULL DEFAULT false;

UPDATE ops.role
SET requires_license = true
WHERE requires_license = false
  AND (
    lower(trim(code)) = 'driver'
    OR lower(trim(name)) IN ('conductor', 'driver')
  );

-- 2) Quitar índices y restricciones de code
DROP INDEX IF EXISTS ops.idx_role_code;
ALTER TABLE ops.role DROP CONSTRAINT IF EXISTS role_code_unique;
ALTER TABLE ops.role DROP CONSTRAINT IF EXISTS role_code_format;

-- 3) Eliminar columna code
ALTER TABLE ops.role DROP COLUMN IF EXISTS code;

-- 4) Nombre único (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'role_name_unique'
  ) THEN
    ALTER TABLE ops.role ADD CONSTRAINT role_name_unique UNIQUE (name);
  END IF;
END $$;

COMMENT ON COLUMN ops.role.requires_license IS 'Si true, licenseExpirationDate es obligatorio en usuarios con este rol';

COMMIT;
