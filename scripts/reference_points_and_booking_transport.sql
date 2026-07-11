-- Script unificado: puntos de referencia y reservas con transporte.
-- PostgreSQL / Supabase
-- Ejecutar despues de tener creadas las tablas base: ops.app_user, ops.menu, ops.role,
-- ops.role_menu_permission y ops.booking.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. Catalogo de puntos de referencia
-- ============================================================

CREATE TABLE IF NOT EXISTS ops.reference_point (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES ops.app_user(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES ops.app_user(id) ON DELETE SET NULL,
  CONSTRAINT reference_point_description_not_empty CHECK (length(trim(description)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_reference_point_status
  ON ops.reference_point (status);

CREATE INDEX IF NOT EXISTS idx_reference_point_created_at
  ON ops.reference_point (created_at DESC);

COMMENT ON TABLE ops.reference_point IS 'Catalogo de puntos de referencia geograficos o logisticos';
COMMENT ON COLUMN ops.reference_point.description IS 'Descripcion del punto de referencia';
COMMENT ON COLUMN ops.reference_point.created_by IS 'Usuario que creo el registro';
COMMENT ON COLUMN ops.reference_point.updated_by IS 'Usuario que modifico el registro por ultima vez';

CREATE OR REPLACE FUNCTION ops.update_reference_point_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reference_point_updated_at ON ops.reference_point;
CREATE TRIGGER trg_reference_point_updated_at
  BEFORE UPDATE ON ops.reference_point
  FOR EACH ROW
  EXECUTE FUNCTION ops.update_reference_point_updated_at();

-- ============================================================
-- 2. Menu y permisos del modulo
-- ============================================================

INSERT INTO ops.menu (code, name, description, icon, route_path, section, sort_order, status)
VALUES (
  'reference-points',
  'Puntos de referencia',
  'Catalogo de puntos de referencia',
  'MapPin',
  '/reference-points',
  'Gestion',
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

-- ============================================================
-- 3. Relacion de reservas con puntos de referencia
-- ============================================================

ALTER TABLE ops.booking
  ADD COLUMN IF NOT EXISTS reference_point_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_booking_reference_point_id
  ON ops.booking(reference_point_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'booking_reference_point_fk'
      AND n.nspname = 'ops'
      AND t.relname = 'booking'
  ) THEN
    ALTER TABLE ops.booking
      ADD CONSTRAINT booking_reference_point_fk
      FOREIGN KEY (reference_point_id) REFERENCES ops.reference_point(id) ON DELETE SET NULL;
  END IF;
END $$;

-- IMPORTANTE:
-- Si ya existen reservas con transport = true y reference_point_id NULL,
-- actualizalas antes de activar el constraint obligatorio.
-- Ejemplo:
-- UPDATE ops.booking
-- SET reference_point_id = '<UUID_DE_PUNTO_DE_REFERENCIA>'::uuid
-- WHERE transport = true AND reference_point_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM ops.booking WHERE transport = true AND reference_point_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Existen reservas con transport = true sin reference_point_id. Actualiza esos datos antes de crear el constraint.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'booking_transport_requires_reference_point'
      AND n.nspname = 'ops'
      AND t.relname = 'booking'
  ) THEN
    ALTER TABLE ops.booking
      ADD CONSTRAINT booking_transport_requires_reference_point
      CHECK (transport = false OR reference_point_id IS NOT NULL);
  END IF;
END $$;

COMMENT ON COLUMN ops.booking.reference_point_id IS 'Punto de referencia requerido cuando la reserva requiere transporte';

COMMIT;
