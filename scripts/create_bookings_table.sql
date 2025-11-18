-- Script para crear la tabla de reservas (bookings) en el esquema ops
-- Ejecutar este script en la base de datos PostgreSQL
-- 
-- Esta tabla almacena las reservas de actividades realizadas por recepcionistas
-- Las reservas están vinculadas a una planeación específica (activity_schedule)
-- Pueden tener una compañía asociada (socio) con comisión parametrizada o manual
-- Pueden requerir transporte opcional

CREATE TABLE IF NOT EXISTS ops.booking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_schedule_id UUID NOT NULL REFERENCES ops.activity_schedule(id) ON DELETE RESTRICT,
    company_id UUID REFERENCES ops.company(id) ON DELETE SET NULL,
    transport_id UUID REFERENCES ops.transport(id) ON DELETE SET NULL,
    number_of_people INTEGER NOT NULL CHECK (number_of_people > 0),
    commission_percentage NUMERIC(5, 2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID -- ID del usuario recepcionista que creó la reserva
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_booking_activity_schedule_id ON ops.booking(activity_schedule_id);
CREATE INDEX IF NOT EXISTS idx_booking_company_id ON ops.booking(company_id);
CREATE INDEX IF NOT EXISTS idx_booking_transport_id ON ops.booking(transport_id);
CREATE INDEX IF NOT EXISTS idx_booking_status ON ops.booking(status);
CREATE INDEX IF NOT EXISTS idx_booking_created_at ON ops.booking(created_at);
CREATE INDEX IF NOT EXISTS idx_booking_created_by ON ops.booking(created_by);

-- Índice compuesto para búsquedas por fecha y estado
CREATE INDEX IF NOT EXISTS idx_booking_schedule_status 
ON ops.booking(activity_schedule_id, status) 
WHERE status IN ('pending', 'confirmed');

-- Comentarios en las tablas y columnas
COMMENT ON TABLE ops.booking IS 'Tabla para almacenar reservas de actividades realizadas por recepcionistas';
COMMENT ON COLUMN ops.booking.id IS 'Identificador único de la reserva (UUID)';
COMMENT ON COLUMN ops.booking.activity_schedule_id IS 'Referencia a la planeación (fecha/hora) de la actividad';
COMMENT ON COLUMN ops.booking.company_id IS 'Referencia a la compañía (socio) que trajo el cliente (opcional)';
COMMENT ON COLUMN ops.booking.transport_id IS 'Referencia al transporte asignado (opcional)';
COMMENT ON COLUMN ops.booking.number_of_people IS 'Cantidad de personas en la reserva';
COMMENT ON COLUMN ops.booking.commission_percentage IS 'Porcentaje de comisión (puede ser de la compañía o manual)';
COMMENT ON COLUMN ops.booking.customer_name IS 'Nombre del cliente';
COMMENT ON COLUMN ops.booking.customer_email IS 'Email del cliente (opcional)';
COMMENT ON COLUMN ops.booking.customer_phone IS 'Teléfono del cliente (opcional)';
COMMENT ON COLUMN ops.booking.status IS 'Estado de la reserva: pending, confirmed, cancelled';
COMMENT ON COLUMN ops.booking.created_at IS 'Fecha y hora de creación de la reserva';
COMMENT ON COLUMN ops.booking.updated_at IS 'Fecha y hora de última actualización';
COMMENT ON COLUMN ops.booking.created_by IS 'ID del usuario recepcionista que creó la reserva';

