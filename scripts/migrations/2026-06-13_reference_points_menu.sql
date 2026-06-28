-- Menú y permisos: Puntos de referencia
-- Ejecutar después de create_reference_points_table.sql

BEGIN;

INSERT INTO ops.menu (code, name, description, icon, route_path, section, sort_order, status)
VALUES
  (
    'reference-points',
    'Puntos de referencia',
    'Catálogo de puntos de referencia',
    'MapPin',
    '/reference-points',
    'Gestión',
    95,
    true
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  route_path = EXCLUDED.route_path,
  section = EXCLUDED.section,
  sort_order = EXCLUDED.sort_order,
  status = EXCLUDED.status,
  updated_at = now();

-- Permisos completos para Administrador
INSERT INTO ops.role_menu_permission (role_id, menu_id, can_read, can_write, can_delete, status)
SELECT
  r.id,
  m.id,
  true,
  true,
  true,
  true
FROM ops.role r
CROSS JOIN ops.menu m
WHERE m.code = 'reference-points'
  AND (
    r.id = '18af500d-6187-4632-b206-b176e83d776e'::uuid
    OR lower(trim(r.name)) = 'administrador'
  )
ON CONFLICT (role_id, menu_id) DO UPDATE SET
  can_read = EXCLUDED.can_read,
  can_write = EXCLUDED.can_write,
  can_delete = EXCLUDED.can_delete,
  status = EXCLUDED.status,
  updated_at = now();

COMMIT;
