-- El tipo de actividad deja de ser requerido y se oculta/inactiva como catálogo.
-- Ejecutar en PostgreSQL sobre el esquema ops.

BEGIN;

ALTER TABLE ops.activity
  ALTER COLUMN activity_type_id DROP NOT NULL;

UPDATE ops.activity_type
SET status = false,
    updated_at = CURRENT_TIMESTAMP
WHERE status = true;

UPDATE ops.menu
SET status = false,
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'activity-types';

UPDATE ops.role_menu_permission rmp
SET can_read = false,
    can_write = false,
    can_delete = false,
    status = false,
    updated_at = CURRENT_TIMESTAMP
FROM ops.menu m
WHERE rmp.menu_id = m.id
  AND m.code = 'activity-types';

COMMIT;
