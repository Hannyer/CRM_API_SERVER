// scripts/remove_guide_fields.js
// Script para eliminar las columnas is_leader y max_party_size de la tabla guide
const { Client } = require('pg');
require('dotenv').config();

const SQL_SCRIPT = `
-- ============================================================
-- Eliminar campos is_leader y max_party_size de ops.guide
-- ============================================================

-- 1. Eliminar columna is_leader si existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'ops' 
        AND table_name = 'guide' 
        AND column_name = 'is_leader'
    ) THEN
        ALTER TABLE ops.guide DROP COLUMN is_leader;
        RAISE NOTICE 'Columna is_leader eliminada exitosamente';
    ELSE
        RAISE NOTICE 'Columna is_leader no existe, se omite';
    END IF;
END $$;

-- 2. Eliminar columna max_party_size si existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'ops' 
        AND table_name = 'guide' 
        AND column_name = 'max_party_size'
    ) THEN
        ALTER TABLE ops.guide DROP COLUMN max_party_size;
        RAISE NOTICE 'Columna max_party_size eliminada exitosamente';
    ELSE
        RAISE NOTICE 'Columna max_party_size no existe, se omite';
    END IF;
END $$;

-- 3. Eliminar índice de is_leader si existe
DROP INDEX IF EXISTS ops.idx_guide_is_leader;

-- 4. Eliminar función get_guides_availability anterior (para cambiar tipo de retorno)
DROP FUNCTION IF EXISTS ops.get_guides_availability(DATE, UUID, UUID[]);

-- 5. Recrear función get_guides_availability sin is_leader
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
`;

async function removeGuideFields() {
  const url = process.env.DATABASE_URL;
  
  if (!url) {
    console.error('❌ Error: DATABASE_URL no está definida en las variables de entorno');
    process.exit(1);
  }

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

    console.log('🔄 Eliminando campos is_leader y max_party_size...');
    
    // Ejecutar el script SQL
    await client.query(SQL_SCRIPT);

    console.log('✅ Campos eliminados exitosamente\n');
    console.log('✅ Función get_guides_availability actualizada\n');
    console.log('🎉 ¡Proceso completado exitosamente!');

  } catch (error) {
    console.error('\n❌ Error al eliminar los campos:');
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
removeGuideFields().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

