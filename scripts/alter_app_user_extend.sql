-- Migración: ampliar ops.app_user (cédula, teléfono, inglés, enum de roles)
-- Ejecutar sobre bases que ya tienen ops.app_user con role TEXT

-- 1. Enum de roles (inglés)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_user_role') THEN
        CREATE TYPE ops.app_user_role AS ENUM (
            'admin',
            'driver',
            'receptionist',
            'operator',
            'guide'
        );
    END IF;
END $$;

-- 2. Nuevas columnas
ALTER TABLE ops.app_user
    ADD COLUMN IF NOT EXISTS cedula VARCHAR(20),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
    ADD COLUMN IF NOT EXISTS speaks_english BOOLEAN NOT NULL DEFAULT false;

-- 3. Migrar rol legacy operador -> operator
UPDATE ops.app_user SET role = 'operator' WHERE role = 'operador';

-- 4. Completar datos obligatorios en filas existentes antes de NOT NULL (ajustar según su data)
-- UPDATE ops.app_user SET cedula = 'PENDIENTE-' || LEFT(id::text, 8), phone = '00000000' WHERE cedula IS NULL;

ALTER TABLE ops.app_user
    ALTER COLUMN cedula SET NOT NULL,
    ALTER COLUMN phone SET NOT NULL;

-- 5. Cambiar columna role a enum
ALTER TABLE ops.app_user DROP CONSTRAINT IF EXISTS app_user_role_check;

ALTER TABLE ops.app_user
    ALTER COLUMN role TYPE ops.app_user_role
    USING role::ops.app_user_role;

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_user_cedula_unique
    ON ops.app_user (UPPER(TRIM(cedula)));

COMMENT ON COLUMN ops.app_user.cedula IS 'Cédula del usuario (obligatorio, única)';
COMMENT ON COLUMN ops.app_user.phone IS 'Teléfono (obligatorio)';
COMMENT ON COLUMN ops.app_user.speaks_english IS 'Indica si habla inglés';
COMMENT ON COLUMN ops.app_user.role IS 'Rol: admin | driver | receptionist | operator | guide';

-- Actualizar configuración legacy de rol cliente externo
UPDATE ops.configuration
SET value = 'operator'
WHERE key06 = 'ROLCLIENTE' AND value = 'operador';
