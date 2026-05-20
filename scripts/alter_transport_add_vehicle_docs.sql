-- Migración: documentación vehicular obligatoria en ops.transport
-- Ejecutar si la tabla ya existía sin estos campos o con ellos nullable

ALTER TABLE ops.transport
    ADD COLUMN IF NOT EXISTS license_plate VARCHAR(20),
    ADD COLUMN IF NOT EXISTS circulation_permit_expiration_date DATE,
    ADD COLUMN IF NOT EXISTS ctp_expiration_date DATE;

-- Completar registros existentes antes de aplicar NOT NULL (ajustar valores según su data real)
-- UPDATE ops.transport SET license_plate = 'PENDIENTE', circulation_permit_expiration_date = CURRENT_DATE, ctp_expiration_date = CURRENT_DATE WHERE license_plate IS NULL;

ALTER TABLE ops.transport
    ALTER COLUMN license_plate SET NOT NULL,
    ALTER COLUMN circulation_permit_expiration_date SET NOT NULL,
    ALTER COLUMN ctp_expiration_date SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_license_plate_unique
    ON ops.transport (UPPER(TRIM(license_plate)));

COMMENT ON COLUMN ops.transport.license_plate IS 'Placa del vehículo (obligatorio, única)';
COMMENT ON COLUMN ops.transport.circulation_permit_expiration_date IS 'Fecha de vencimiento del permiso de circulación (obligatorio)';
COMMENT ON COLUMN ops.transport.ctp_expiration_date IS 'Fecha de vencimiento del CTP (obligatorio)';
