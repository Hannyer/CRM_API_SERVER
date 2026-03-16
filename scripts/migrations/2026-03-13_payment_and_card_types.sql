-- Payment types + card types + booking fields (Supabase / Postgres)
-- Recomendado ejecutar en una transacción.

BEGIN;

-- Extensión para gen_random_uuid (si no existe)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Tablas catálogo
CREATE TABLE IF NOT EXISTS ops.payment_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.card_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Seed inicial (idempotente)
INSERT INTO ops.payment_type (name, status)
VALUES ('Efectivo', true), ('Tarjeta', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO ops.card_type (name, status)
VALUES ('VISA', true), ('MASTERCARD', true)
ON CONFLICT (name) DO NOTHING;

-- 3) Columnas nuevas en booking
ALTER TABLE ops.booking
  ADD COLUMN IF NOT EXISTS comment text NULL,
  ADD COLUMN IF NOT EXISTS payment_type_id uuid NULL,
  ADD COLUMN IF NOT EXISTS card_type_id uuid NULL;

-- 4) Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_payment_type_fk'
  ) THEN
    ALTER TABLE ops.booking
      ADD CONSTRAINT booking_payment_type_fk
      FOREIGN KEY (payment_type_id) REFERENCES ops.payment_type(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_card_type_fk'
  ) THEN
    ALTER TABLE ops.booking
      ADD CONSTRAINT booking_card_type_fk
      FOREIGN KEY (card_type_id) REFERENCES ops.card_type(id);
  END IF;
END $$;

-- 5) Regla de integridad: si payment_type = 'Tarjeta' => card_type_id requerido
-- Se implementa con trigger porque un CHECK no puede hacer subqueries en Postgres.

CREATE OR REPLACE FUNCTION ops.booking_validate_card_type()
RETURNS trigger AS $$
DECLARE
  v_payment_name text;
BEGIN
  -- Si no hay payment_type, no validamos nada
  IF NEW.payment_type_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_payment_name
  FROM ops.payment_type
  WHERE id = NEW.payment_type_id;

  IF v_payment_name = 'Tarjeta' AND NEW.card_type_id IS NULL THEN
    RAISE EXCEPTION 'card_type_id es requerido cuando el tipo de pago es Tarjeta'
      USING ERRCODE = '23514'; -- check_violation
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger idempotente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'booking_validate_card_type_trg'
  ) THEN
    DROP TRIGGER booking_validate_card_type_trg ON ops.booking;
  END IF;

  CREATE TRIGGER booking_validate_card_type_trg
  BEFORE INSERT OR UPDATE ON ops.booking
  FOR EACH ROW
  EXECUTE FUNCTION ops.booking_validate_card_type();
END $$;

COMMIT;

