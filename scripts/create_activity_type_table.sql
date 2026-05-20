-- Tabla de tipos de actividad (ops.activity_type)

CREATE TABLE IF NOT EXISTS ops.activity_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NULL,
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT activity_type_name_key UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_activity_type_status ON ops.activity_type (status);

COMMENT ON TABLE ops.activity_type IS 'Catálogo de tipos de actividad turística';
COMMENT ON COLUMN ops.activity_type.name IS 'Nombre único del tipo de actividad (obligatorio)';
COMMENT ON COLUMN ops.activity_type.description IS 'Descripción opcional';
COMMENT ON COLUMN ops.activity_type.status IS 'Estado del registro (soft delete con false)';
