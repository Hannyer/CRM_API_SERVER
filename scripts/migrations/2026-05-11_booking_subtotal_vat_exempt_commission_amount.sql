-- Booking: monetary subtotal, VAT amount, tax exempt flag, commission amount (English column names)
-- Run after ops.booking exists.

BEGIN;

ALTER TABLE ops.booking
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(14, 2) NULL,
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(14, 2) NULL,
  ADD COLUMN IF NOT EXISTS total NUMERIC(14, 2) NULL,
  ADD COLUMN IF NOT EXISTS exempt BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(14, 2) NULL;

COMMENT ON COLUMN ops.booking.subtotal IS 'Subtotal amount before VAT';
COMMENT ON COLUMN ops.booking.vat_amount IS 'VAT (IVA) monetary amount';
COMMENT ON COLUMN ops.booking.total IS 'Grand total amount (typically subtotal + VAT when not exempt)';
COMMENT ON COLUMN ops.booking.exempt IS 'Whether the booking is tax-exempt';
COMMENT ON COLUMN ops.booking.commission_amount IS 'Commission monetary amount (complement to commission_percentage)';

COMMIT;
