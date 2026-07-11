-- Punto de referencia obligatorio cuando una reserva requiere transporte.
-- Ejecutar en PostgreSQL/Supabase. Script idempotente.

BEGIN;

ALTER TABLE ops.booking
  ADD COLUMN IF NOT EXISTS reference_point_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_booking_reference_point_id
  ON ops.booking(reference_point_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_reference_point_fk'
  ) THEN
    ALTER TABLE ops.booking
      ADD CONSTRAINT booking_reference_point_fk
      FOREIGN KEY (reference_point_id) REFERENCES ops.reference_point(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Antes de activar el CHECK, corrige reservas existentes con transport = true y sin referencia.
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
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_transport_requires_reference_point'
  ) THEN
    ALTER TABLE ops.booking
      ADD CONSTRAINT booking_transport_requires_reference_point
      CHECK (transport = false OR reference_point_id IS NOT NULL);
  END IF;
END $$;

COMMENT ON COLUMN ops.booking.reference_point_id IS 'Punto de referencia requerido cuando la reserva requiere transporte';

COMMIT;
