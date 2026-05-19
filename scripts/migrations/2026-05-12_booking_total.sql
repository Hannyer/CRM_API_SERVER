-- Add total column if you already applied 2026-05-11 without `total`.
-- Safe to run multiple times.

BEGIN;

ALTER TABLE ops.booking
  ADD COLUMN IF NOT EXISTS total NUMERIC(14, 2) NULL;

COMMENT ON COLUMN ops.booking.total IS 'Grand total amount (typically subtotal + VAT when not exempt)';

COMMIT;
