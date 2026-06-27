ALTER TABLE ops.booking_transport
ADD COLUMN IF NOT EXISTS driver_id UUID NULL REFERENCES ops.app_user(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_booking_transport_driver_id
    ON ops.booking_transport(driver_id);

COMMENT ON COLUMN ops.booking_transport.driver_id IS 'Usuario conductor asignado a la reservación';
