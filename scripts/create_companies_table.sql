-- Script para crear la tabla de compañías (socios) en el esquema ops
-- Ejecutar este script en la base de datos PostgreSQL
-- 
-- Esta tabla almacena información de compañías que son socios que pueden traer clientes
-- Cada compañía tiene un porcentaje de comisión parametrizado

CREATE TABLE IF NOT EXISTS ops.company (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    commission_percentage NUMERIC(5, 2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_company_status ON ops.company(status);
CREATE INDEX IF NOT EXISTS idx_company_name ON ops.company(name);
CREATE INDEX IF NOT EXISTS idx_company_created_at ON ops.company(created_at);

-- Comentarios en las tablas y columnas
COMMENT ON TABLE ops.company IS 'Tabla para almacenar información de compañías (socios) que pueden traer clientes';
COMMENT ON COLUMN ops.company.id IS 'Identificador único de la compañía (UUID)';
COMMENT ON COLUMN ops.company.name IS 'Nombre de la compañía';
COMMENT ON COLUMN ops.company.commission_percentage IS 'Porcentaje de comisión que recibe la compañía (0-100)';
COMMENT ON COLUMN ops.company.status IS 'Estado de la compañía: true = activa, false = inactiva';
COMMENT ON COLUMN ops.company.created_at IS 'Fecha y hora de creación del registro';
COMMENT ON COLUMN ops.company.updated_at IS 'Fecha y hora de última actualización del registro';

