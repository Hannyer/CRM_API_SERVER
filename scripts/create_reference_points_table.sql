-- Tabla: puntos de referencia (ops.reference_point)
-- PostgreSQL — esquema ops

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

CREATE INDEX IF NOT EXISTS idx_reference_point_status ON ops.reference_point (status);
CREATE INDEX IF NOT EXISTS idx_reference_point_created_at ON ops.reference_point (created_at DESC);

COMMENT ON TABLE ops.reference_point IS 'Catálogo de puntos de referencia geográficos o logísticos';
COMMENT ON COLUMN ops.reference_point.description IS 'Descripción del punto de referencia';
COMMENT ON COLUMN ops.reference_point.created_by IS 'Usuario que creó el registro (JWT Bearer)';
COMMENT ON COLUMN ops.reference_point.updated_by IS 'Usuario que modificó el registro por última vez';

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

COMMIT;
