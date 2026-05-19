-- =============================================================================
-- ops.booking — monetary / tax columns (PostgreSQL)
-- Run against the database where ops.booking exists.
-- Idempotent: IF NOT EXISTS.
-- =============================================================================

BEGIN;

ALTER TABLE ops.booking
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(14, 2) NULL,
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(14, 2) NULL,
  ADD COLUMN IF NOT EXISTS total NUMERIC(14, 2) NULL,
  ADD COLUMN IF NOT EXISTS exempt BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(14, 2) NULL;

COMMENT ON COLUMN ops.booking.subtotal IS 'Subtotal before VAT';
COMMENT ON COLUMN ops.booking.vat_amount IS 'VAT (IVA) amount';
COMMENT ON COLUMN ops.booking.total IS 'Grand total (e.g. subtotal + VAT when not exempt)';
COMMENT ON COLUMN ops.booking.exempt IS 'Tax-exempt flag';
COMMENT ON COLUMN ops.booking.commission_amount IS 'Commission amount (monetary; see also commission_percentage)';

COMMIT;
