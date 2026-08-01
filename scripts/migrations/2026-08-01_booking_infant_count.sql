-- Agrega conteo de infantes menores a 6 años a las reservas.
-- Los infantes ocupan cupo, pero tienen precio 0.

ALTER TABLE ops.booking
  ADD COLUMN IF NOT EXISTS infant_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE ops.booking DROP CONSTRAINT IF EXISTS booking_infant_count_non_negative;
ALTER TABLE ops.booking ADD CONSTRAINT booking_infant_count_non_negative CHECK (infant_count >= 0);

COMMENT ON COLUMN ops.booking.infant_count IS 'Cantidad de infantes menores a 6 años incluidos en la reserva (precio 0)';
