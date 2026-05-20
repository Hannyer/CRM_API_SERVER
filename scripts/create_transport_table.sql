-- Script para crear la tabla de transporte en el esquema ops
-- Ejecutar este script en la base de datos PostgreSQL

CREATE TABLE IF NOT EXISTS ops.transport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    model VARCHAR(255) NOT NULL,
    operational_status BOOLEAN NOT NULL DEFAULT true,
    status BOOLEAN NOT NULL DEFAULT true,
    license_plate VARCHAR(20) NOT NULL,
    circulation_permit_expiration_date DATE NOT NULL,
    ctp_expiration_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_transport_operational_status ON ops.transport(operational_status);
CREATE INDEX IF NOT EXISTS idx_transport_status ON ops.transport(status);
CREATE INDEX IF NOT EXISTS idx_transport_model ON ops.transport(model);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_license_plate_unique
    ON ops.transport (UPPER(TRIM(license_plate)));

-- Comentarios en las columnas
COMMENT ON TABLE ops.transport IS 'Tabla para almacenar información de unidades de transporte';
COMMENT ON COLUMN ops.transport.id IS 'Identificador único del transporte (UUID)';
COMMENT ON COLUMN ops.transport.capacity IS 'Capacidad de pasajeros de la unidad';
COMMENT ON COLUMN ops.transport.model IS 'Modelo de la unidad de transporte';
COMMENT ON COLUMN ops.transport.operational_status IS 'Estado operativo: true = activo, false = fuera de circulación';
COMMENT ON COLUMN ops.transport.status IS 'Estado general del registro: true = activo, false = eliminado (soft delete)';
COMMENT ON COLUMN ops.transport.license_plate IS 'Placa del vehículo';
COMMENT ON COLUMN ops.transport.circulation_permit_expiration_date IS 'Fecha de vencimiento del permiso de circulación';
COMMENT ON COLUMN ops.transport.ctp_expiration_date IS 'Fecha de vencimiento del CTP (Certificado de Transporte Público)';

