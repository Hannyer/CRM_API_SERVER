-- ============================================================
-- Script para reconstruir la tabla de Guías y estructuras relacionadas
-- Base de datos: PostgreSQL
-- Esquema: ops
-- ============================================================
-- Uso: psql -U <usuario> -d <base> -f scripts/create_guides_table.sql
-- ============================================================

-- Asegurar que el esquema ops existe
CREATE SCHEMA IF NOT EXISTS ops;

-- Extensiones necesarias (si no existen)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. Tabla principal: ops.guide
-- ============================================================

CREATE TABLE IF NOT EXISTS ops.guide (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Índices para la tabla guide
CREATE INDEX IF NOT EXISTS idx_guide_status ON ops.guide(status);
CREATE INDEX IF NOT EXISTS idx_guide_email ON ops.guide(email) WHERE email IS NOT NULL;

-- Comentarios para documentación
COMMENT ON TABLE ops.guide IS 'Tabla principal de guías turísticos';
COMMENT ON COLUMN ops.guide.id IS 'Identificador único del guía';
COMMENT ON COLUMN ops.guide.name IS 'Nombre completo del guía';
COMMENT ON COLUMN ops.guide.email IS 'Correo electrónico del guía (opcional pero recomendado)';
COMMENT ON COLUMN ops.guide.phone IS 'Teléfono del guía (opcional)';
COMMENT ON COLUMN ops.guide.status IS 'Estado activo/inactivo del guía';

-- ============================================================
-- 2. Tabla de relación: ops.guide_language
-- Relación muchos a muchos entre guías e idiomas
-- ============================================================

-- Asegurar que la tabla de idiomas existe (si no existe, crearla primero)
CREATE TABLE IF NOT EXISTS ops.language (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Crear la tabla de relación guide_language
CREATE TABLE IF NOT EXISTS ops.guide_language (
    guide_id UUID NOT NULL REFERENCES ops.guide(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES ops.language(id) ON DELETE CASCADE,
    PRIMARY KEY (guide_id, language_id)
);

-- Índices para la tabla guide_language
CREATE INDEX IF NOT EXISTS idx_guide_language_guide_id ON ops.guide_language(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_language_language_id ON ops.guide_language(language_id);

-- Comentarios
COMMENT ON TABLE ops.guide_language IS 'Relación muchos a muchos entre guías e idiomas que hablan';
COMMENT ON COLUMN ops.guide_language.guide_id IS 'ID del guía';
COMMENT ON COLUMN ops.guide_language.language_id IS 'ID del idioma';

-- ============================================================
-- 3. Función para obtener disponibilidad de guías
-- ============================================================
-- Esta función determina qué guías están disponibles para una fecha específica,
-- opcionalmente filtrada por tipo de actividad e idiomas requeridos.

CREATE OR REPLACE FUNCTION ops.get_guides_availability(
    p_date DATE,
    p_activity_type_id UUID DEFAULT NULL,
    p_language_ids UUID[] DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    email TEXT,
    is_available BOOLEAN,
    languages TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH guides_with_languages AS (
        -- Obtener todos los guías activos con sus idiomas
        SELECT 
            g.id,
            g.name,
            g.email,
            COALESCE(
                array_agg(DISTINCT l.code ORDER BY l.code) FILTER (WHERE l.code IS NOT NULL),
                ARRAY[]::TEXT[]
            ) AS guide_languages
        FROM ops.guide g
        LEFT JOIN ops.guide_language gl ON gl.guide_id = g.id
        LEFT JOIN ops.language l ON l.id = gl.language_id AND l.status = true
        WHERE g.status = true
        GROUP BY g.id, g.name, g.email
    ),
    guides_assigned_on_date AS (
        -- Guías que ya están asignados a actividades en la fecha especificada
        SELECT DISTINCT aa.guide_id
        FROM ops.activity_assignment aa
        INNER JOIN ops.activity a ON a.id = aa.activity_id
        INNER JOIN ops.activity_schedule s ON s.activity_id = a.id
        WHERE DATE(s.scheduled_start) = p_date
            AND s.status = true
            AND a.status = true
            AND (p_activity_type_id IS NULL OR a.activity_type_id = p_activity_type_id)
    ),
    available_guides AS (
        -- Filtrar guías que tienen los idiomas requeridos y no están asignados
        SELECT 
            gwl.id,
            gwl.name,
            gwl.email,
            gwl.is_leader,
            CASE 
                WHEN gad.guide_id IS NULL THEN true
                ELSE false
            END AS is_available,
            gwl.guide_languages AS languages
        FROM guides_with_languages gwl
        LEFT JOIN guides_assigned_on_date gad ON gad.guide_id = gwl.id
        WHERE 
            -- Si se requieren idiomas específicos, el guía debe tenerlos
            (p_language_ids IS NULL OR 
             p_language_ids = ARRAY[]::UUID[] OR
             EXISTS (
                 SELECT 1 
                 FROM ops.guide_language gl2
                 INNER JOIN ops.language l2 ON l2.id = gl2.language_id
                 WHERE gl2.guide_id = gwl.id
                     AND l2.id = ANY(p_language_ids)
                     AND l2.status = true
             ))
    )
    SELECT 
        ag.id,
        ag.name,
        ag.email,
        ag.is_available,
        ag.languages
    FROM available_guides ag
    ORDER BY ag.name ASC;
END;
$$ LANGUAGE plpgsql;

-- Comentario de la función
COMMENT ON FUNCTION ops.get_guides_availability IS 'Obtiene la lista de guías disponibles para una fecha, opcionalmente filtrada por tipo de actividad e idiomas';

-- ============================================================
-- 4. Trigger para actualizar updated_at automáticamente
-- ============================================================

CREATE OR REPLACE FUNCTION ops.update_guide_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS trigger_update_guide_updated_at ON ops.guide;
CREATE TRIGGER trigger_update_guide_updated_at
    BEFORE UPDATE ON ops.guide
    FOR EACH ROW
    EXECUTE FUNCTION ops.update_guide_updated_at();

-- ============================================================
-- 5. Verificaciones y datos de ejemplo (opcionales)
-- ============================================================

-- Verificar que las tablas se crearon correctamente
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'ops' AND table_name = 'guide') THEN
        RAISE NOTICE 'Tabla ops.guide creada exitosamente';
    ELSE
        RAISE EXCEPTION 'Error: No se pudo crear la tabla ops.guide';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'ops' AND table_name = 'guide_language') THEN
        RAISE NOTICE 'Tabla ops.guide_language creada exitosamente';
    ELSE
        RAISE EXCEPTION 'Error: No se pudo crear la tabla ops.guide_language';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_guides_availability' AND pronamespace = 'ops'::regnamespace) THEN
        RAISE NOTICE 'Función ops.get_guides_availability creada exitosamente';
    ELSE
        RAISE EXCEPTION 'Error: No se pudo crear la función ops.get_guides_availability';
    END IF;
END $$;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================

