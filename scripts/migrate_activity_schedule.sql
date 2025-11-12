-- Script de migración para separar actividades de sus planeaciones
-- Ejecutar este script en la base de datos PostgreSQL
-- 
-- Este script:
-- 1. Crea la tabla activity_schedule para almacenar múltiples planeaciones por actividad
-- 2. Migra los datos existentes de scheduled_start y scheduled_end a activity_schedule
-- 3. Agrega el campo status a la tabla activity
-- 4. Elimina las columnas scheduled_start y scheduled_end de activity

-- Paso 1: Crear la tabla activity_schedule
CREATE TABLE IF NOT EXISTS ops.activity_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES ops.activity(id) ON DELETE CASCADE,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_schedule_time CHECK (scheduled_end > scheduled_start)
);

-- Paso 2: Migrar datos existentes de activity a activity_schedule
-- Solo si existen actividades con scheduled_start y scheduled_end
INSERT INTO ops.activity_schedule (activity_id, scheduled_start, scheduled_end, status)
SELECT 
    id,
    scheduled_start,
    scheduled_end,
    true
FROM ops.activity
WHERE scheduled_start IS NOT NULL 
  AND scheduled_end IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM ops.activity_schedule 
    WHERE activity_schedule.activity_id = activity.id
  );

-- Paso 3: Agregar campo status a activity si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'ops' 
        AND table_name = 'activity' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE ops.activity ADD COLUMN status BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- Paso 4: Eliminar columnas scheduled_start y scheduled_end de activity
-- (Comentado por seguridad - descomentar después de verificar la migración)
-- ALTER TABLE ops.activity DROP COLUMN IF EXISTS scheduled_start;
-- ALTER TABLE ops.activity DROP COLUMN IF EXISTS scheduled_end;

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_activity_schedule_activity_id ON ops.activity_schedule(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_schedule_status ON ops.activity_schedule(status);
CREATE INDEX IF NOT EXISTS idx_activity_schedule_start ON ops.activity_schedule(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_activity_schedule_end ON ops.activity_schedule(scheduled_end);
CREATE INDEX IF NOT EXISTS idx_activity_status ON ops.activity(status);

-- Índice compuesto para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_activity_schedule_date_range 
ON ops.activity_schedule(scheduled_start, scheduled_end) 
WHERE status = true;

-- Comentarios en las tablas y columnas
COMMENT ON TABLE ops.activity_schedule IS 'Tabla para almacenar múltiples planeaciones (fechas/horas) por actividad';
COMMENT ON COLUMN ops.activity_schedule.id IS 'Identificador único de la planeación (UUID)';
COMMENT ON COLUMN ops.activity_schedule.activity_id IS 'Referencia a la actividad padre';
COMMENT ON COLUMN ops.activity_schedule.scheduled_start IS 'Fecha y hora de inicio programada';
COMMENT ON COLUMN ops.activity_schedule.scheduled_end IS 'Fecha y hora de fin programada';
COMMENT ON COLUMN ops.activity_schedule.status IS 'Estado de la planeación: true = activa, false = inactiva';
COMMENT ON COLUMN ops.activity.status IS 'Estado de la actividad: true = activa, false = inactiva';

