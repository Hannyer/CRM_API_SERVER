-- Agrega datos de contacto obligatorios para companias.

ALTER TABLE ops.company
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(30);

UPDATE ops.company
SET email = 'pendiente-' || replace(id::text, '-', '') || '@sin-correo.local'
WHERE email IS NULL OR btrim(email) = '';

UPDATE ops.company
SET phone = 'PENDIENTE'
WHERE phone IS NULL OR btrim(phone) = '';

ALTER TABLE ops.company
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN phone SET NOT NULL;

ALTER TABLE ops.company DROP CONSTRAINT IF EXISTS company_email_not_empty;
ALTER TABLE ops.company ADD CONSTRAINT company_email_not_empty CHECK (btrim(email) <> '');

ALTER TABLE ops.company DROP CONSTRAINT IF EXISTS company_phone_not_empty;
ALTER TABLE ops.company ADD CONSTRAINT company_phone_not_empty CHECK (btrim(phone) <> '');

CREATE INDEX IF NOT EXISTS idx_company_email ON ops.company(email);

COMMENT ON COLUMN ops.company.email IS 'Correo electronico de contacto de la compania';
COMMENT ON COLUMN ops.company.phone IS 'Numero de telefono de contacto de la compania';
