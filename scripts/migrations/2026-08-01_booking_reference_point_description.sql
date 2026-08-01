-- Permite capturar una referencia manual de transporte y persiste el snapshot
-- de la descripcion del punto de referencia seleccionado desde catalogo.

BEGIN;

ALTER TABLE ops.booking
  ADD COLUMN IF NOT EXISTS reference_point_description TEXT NULL;

UPDATE ops.booking b
SET reference_point_description = rp.description
FROM ops.reference_point rp
WHERE b.reference_point_id = rp.id
  AND (b.reference_point_description IS NULL OR length(trim(b.reference_point_description)) = 0);

ALTER TABLE ops.booking DROP CONSTRAINT IF EXISTS booking_transport_requires_reference_point;
ALTER TABLE ops.booking DROP CONSTRAINT IF EXISTS booking_transport_requires_reference_description;

ALTER TABLE ops.booking
  ADD CONSTRAINT booking_transport_requires_reference_description
  CHECK (
    transport = false
    OR length(trim(COALESCE(reference_point_description, ''))) > 0
  );

COMMENT ON COLUMN ops.booking.reference_point_id IS 'Punto de referencia de catalogo usado para transporte; puede ser null si se digita referencia manual';
COMMENT ON COLUMN ops.booking.reference_point_description IS 'Descripcion del punto de referencia seleccionado o referencia manual para transporte';

COMMIT;
