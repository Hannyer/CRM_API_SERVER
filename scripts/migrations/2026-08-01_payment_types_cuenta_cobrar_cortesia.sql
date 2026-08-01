-- Agrega nuevos tipos de pago para reservas.
-- Tambien elimina la regla antigua que exigia tipo de tarjeta cuando el pago era Tarjeta.

BEGIN;

INSERT INTO ops.payment_type (name, status)
VALUES
  ('Cuenta cobrar', true),
  ('Cortesía (CPL)', true)
ON CONFLICT (name) DO UPDATE
SET status = EXCLUDED.status,
    updated_at = now();

DROP TRIGGER IF EXISTS booking_validate_card_type_trg ON ops.booking;
DROP FUNCTION IF EXISTS ops.booking_validate_card_type();

COMMIT;
