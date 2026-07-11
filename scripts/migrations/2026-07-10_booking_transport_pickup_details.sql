-- Detalles de recogida para asignacion de transporte.

BEGIN;

ALTER TABLE ops.booking_transport
  ADD COLUMN IF NOT EXISTS reference_point_id uuid NULL,
  ADD COLUMN IF NOT EXISTS pickup_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_booking_transport_reference_point_id
  ON ops.booking_transport(reference_point_id);

CREATE INDEX IF NOT EXISTS idx_booking_transport_pickup_at
  ON ops.booking_transport(pickup_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'booking_transport_reference_point_fk'
      AND n.nspname = 'ops'
      AND t.relname = 'booking_transport'
  ) THEN
    ALTER TABLE ops.booking_transport
      ADD CONSTRAINT booking_transport_reference_point_fk
      FOREIGN KEY (reference_point_id) REFERENCES ops.reference_point(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Inicializa asignaciones existentes con el punto de referencia de la reserva
-- y una hora antes del inicio de la actividad.
UPDATE ops.booking_transport bt
SET reference_point_id = COALESCE(bt.reference_point_id, b.reference_point_id),
    pickup_at = COALESCE(bt.pickup_at, s.scheduled_start - interval '1 hour')
FROM ops.booking b
JOIN ops.activity_schedule s ON s.id = b.activity_schedule_id
WHERE b.id = bt.booking_id;

COMMIT;
