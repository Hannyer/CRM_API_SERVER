-- Módulo de seguridad: menú dinámico + permisos por rol (Read / Write / Delete)
-- PostgreSQL — esquema ops
-- Ejecutar en DBeaver / psql

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Catálogo de módulos / ítems de menú
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ops.menu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NULL REFERENCES ops.menu(id) ON DELETE SET NULL,
  code varchar(100) NOT NULL,
  name varchar(150) NOT NULL,
  description varchar(255) NULL,
  icon varchar(100) NULL,
  route_path varchar(200) NULL,
  section varchar(80) NULL,
  sort_order int NOT NULL DEFAULT 0,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT menu_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_menu_parent_id ON ops.menu (parent_id);
CREATE INDEX IF NOT EXISTS idx_menu_status ON ops.menu (status);
CREATE INDEX IF NOT EXISTS idx_menu_sort ON ops.menu (sort_order);

COMMENT ON TABLE ops.menu IS 'Catálogo de módulos del CRM para menú dinámico';
COMMENT ON COLUMN ops.menu.code IS 'Identificador estable (ej. bookings, users)';
COMMENT ON COLUMN ops.menu.route_path IS 'Ruta SPA del frontend (ej. /bookings)';
COMMENT ON COLUMN ops.menu.section IS 'Agrupación visual en sidebar (Reservas, Operación, Gestión, Seguridad)';

-- ---------------------------------------------------------------------------
-- Permisos por rol y módulo
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ops.role_menu_permission (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES ops.role(id) ON DELETE CASCADE,
  menu_id uuid NOT NULL REFERENCES ops.menu(id) ON DELETE CASCADE,
  can_read boolean NOT NULL DEFAULT false,
  can_write boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_menu_permission_role_menu_uq UNIQUE (role_id, menu_id)
);

CREATE INDEX IF NOT EXISTS idx_role_menu_permission_role ON ops.role_menu_permission (role_id);
CREATE INDEX IF NOT EXISTS idx_role_menu_permission_menu ON ops.role_menu_permission (menu_id);

COMMENT ON COLUMN ops.role_menu_permission.can_read IS 'Permiso de lectura / acceso al módulo';
COMMENT ON COLUMN ops.role_menu_permission.can_write IS 'Permiso de creación y edición';
COMMENT ON COLUMN ops.role_menu_permission.can_delete IS 'Permiso de eliminación / desactivación';

-- ---------------------------------------------------------------------------
-- Seed menú (módulos actuales del CRM)
-- ---------------------------------------------------------------------------
INSERT INTO ops.menu (code, name, description, icon, route_path, section, sort_order, status)
VALUES
  ('home', 'Inicio', 'Página principal', 'Home', '/home', NULL, 1, true),
  ('bookings', 'Reservas', 'Gestión de reservas', 'ClipboardList', '/bookings', 'Reservas', 10, true),
  ('activity-types', 'Tipos de actividad', 'Catálogo de tipos', 'Tags', '/activity-types', 'Operación', 20, true),
  ('activities', 'Actividades', 'Actividades turísticas', 'CalendarRange', '/activities', 'Operación', 30, true),
  ('schedules', 'Planeaciones', 'Horarios y planeaciones', 'CalendarClock', '/schedules', 'Operación', 40, true),
  ('transports', 'Transportes', 'Unidades de transporte', 'BusFront', '/transports', 'Operación', 50, true),
  ('guides', 'Guías', 'Guías turísticos', 'UserCircle2', '/guides', 'Operación', 60, true),
  ('companies', 'Compañías', 'Socios y compañías', 'Building2', '/companies', 'Gestión', 70, true),
  ('roles', 'Roles', 'Roles de usuario', 'Shield', '/roles', 'Gestión', 80, true),
  ('users', 'Usuarios', 'Usuarios del sistema', 'Users', '/users', 'Gestión', 90, true),
  ('security', 'Permisos de acceso', 'Matriz de permisos por rol', 'Lock', '/security', 'Seguridad', 100, true),
  ('settings', 'Configuración', 'Ajustes del sistema', 'Settings', '/settings', 'Gestión', 110, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  route_path = EXCLUDED.route_path,
  section = EXCLUDED.section,
  sort_order = EXCLUDED.sort_order,
  status = EXCLUDED.status,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Permisos completos para Administrador (por nombre o UUID conocido)
-- ---------------------------------------------------------------------------
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
WHERE m.status = true
  AND (
    r.id = '18af500d-6187-4632-b206-b176e83d776e'::uuid
    OR lower(trim(r.name)) = 'administrador'
  )
ON CONFLICT (role_id, menu_id) DO UPDATE SET
  can_read = true,
  can_write = true,
  can_delete = true,
  status = true,
  updated_at = now();

COMMIT;
