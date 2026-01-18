// scripts/create-guides-tables.js
// Script para crear/recrear las tablas de guías directamente desde Node.js
const { Client } = require('pg');
require('dotenv').config();

const SQL_SCRIPT = `
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

-- Eliminar índices si existen antes de crearlos (para evitar errores)
DROP INDEX IF EXISTS ops.idx_guide_status;
DROP INDEX IF EXISTS ops.idx_guide_email;

-- Índices para la tabla guide
CREATE INDEX idx_guide_status ON ops.guide(status);
CREATE INDEX idx_guide_email ON ops.guide(email) WHERE email IS NOT NULL;

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

-- Eliminar índices si existen antes de crearlos
DROP INDEX IF EXISTS ops.idx_guide_language_guide_id;
DROP INDEX IF EXISTS ops.idx_guide_language_language_id;

-- Índices para la tabla guide_language
CREATE INDEX idx_guide_language_guide_id ON ops.guide_language(guide_id);
CREATE INDEX idx_guide_language_language_id ON ops.guide_language(language_id);

-- ============================================================
-- 3. Función para obtener disponibilidad de guías
-- ============================================================

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

-- Eliminar trigger si existe antes de crearlo
DROP TRIGGER IF EXISTS trigger_update_guide_updated_at ON ops.guide;

-- Crear trigger
CREATE TRIGGER trigger_update_guide_updated_at
    BEFORE UPDATE ON ops.guide
    FOR EACH ROW
    EXECUTE FUNCTION ops.update_guide_updated_at();
`;

async function createGuidesTables() {
  const url = process.env.DATABASE_URL;
  
  if (!url) {
    console.error('❌ Error: DATABASE_URL no está definida en las variables de entorno');
    console.error('   Asegúrate de tener un archivo .env con DATABASE_URL configurada');
    process.exit(1);
  }

  // Determinar configuración SSL basada en la URL
  const dbUrl = url || '';
  const isRemote = dbUrl.includes('render.com') || 
                   dbUrl.includes('herokuapp.com') || 
                   dbUrl.includes('sslmode=require') ||
                   process.env.NODE_ENV === 'production';

  const client = new Client({
    connectionString: url,
    ssl: isRemote ? { require: true, rejectUnauthorized: false } : false,
    keepAlive: true,
  });

  try {
    console.log('🔄 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    console.log('🔄 Creando tablas de guías...');
    console.log('   - ops.guide');
    console.log('   - ops.guide_language');
    console.log('   - Función ops.get_guides_availability');
    console.log('   - Trigger de actualización\n');

    // Ejecutar el script SQL
    await client.query(SQL_SCRIPT);

    console.log('✅ Tablas y estructuras creadas exitosamente\n');

    // Verificar que las tablas existen
    console.log('🔍 Verificando tablas creadas...');
    
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'ops' 
        AND table_name IN ('guide', 'guide_language')
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('   Tablas encontradas:');
      tablesResult.rows.forEach(row => {
        console.log(`   ✅ ops.${row.table_name}`);
      });
    }

    // Verificar la función
    const functionResult = await client.query(`
      SELECT proname 
      FROM pg_proc 
      WHERE proname = 'get_guides_availability' 
        AND pronamespace = 'ops'::regnamespace
    `);

    if (functionResult.rows.length > 0) {
      console.log('   ✅ Función ops.get_guides_availability');
    }

    console.log('\n🎉 ¡Proceso completado exitosamente!');
    console.log('   Las tablas de guías están listas para usar.\n');

  } catch (error) {
    console.error('\n❌ Error al crear las tablas:');
    console.error('   Mensaje:', error.message);
    if (error.position) {
      console.error('   Posición:', error.position);
    }
    console.error('\n   Detalles:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada\n');
  }
}

// Ejecutar el script
createGuidesTables().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

