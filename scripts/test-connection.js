// Script de diagnóstico de conexión PostgreSQL
// Uso: node scripts/test-connection.js

require('dotenv').config();
const { pool, testConnection } = require('../src/config/db.pg');

async function runDiagnostics() {
  console.log('\n🔍 Diagnóstico de Conexión PostgreSQL\n');
  console.log('=' .repeat(50));
  
  // 1. Verificar variables de entorno
  console.log('\n1️⃣ Verificando Variables de Entorno:');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL no está configurada en .env');
    console.log('\n💡 Solución: Agrega DATABASE_URL a tu archivo .env');
    console.log('   Ejemplo: DATABASE_URL=postgresql://usuario:password@localhost:5432/nombre_db');
    process.exit(1);
  } else {
    // Ocultar contraseña en el log
    const safeUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
    console.log('✅ DATABASE_URL configurada:', safeUrl);
    
    // Detectar tipo de conexión
    const isRemote = dbUrl.includes('render.com') || 
                     dbUrl.includes('herokuapp.com') || 
                     dbUrl.includes('sslmode=require') ||
                     process.env.NODE_ENV === 'production';
    console.log('   Tipo:', isRemote ? 'Remota (SSL requerido)' : 'Local (SSL opcional)');
  }
  
  // 2. Verificar configuración del pool
  console.log('\n2️⃣ Estado del Pool:');
  try {
    console.log('   Total de conexiones:', pool.totalCount);
    console.log('   Conexiones inactivas:', pool.idleCount);
    console.log('   Conexiones en espera:', pool.waitingCount);
  } catch (error) {
    console.error('❌ Error al leer estado del pool:', error.message);
  }
  
  // 3. Probar conexión simple
  console.log('\n3️⃣ Probando Conexión Simple:');
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Conexión exitosa!');
    console.log('   Hora del servidor:', result.rows[0].current_time);
    console.log('   Versión PostgreSQL:', result.rows[0].pg_version.split(',')[0]);
  } catch (error) {
    console.error('❌ Error al conectar:', error.message);
    console.error('   Código:', error.code);
    console.error('   Detalles:', error.detail || 'N/A');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Solución: Verifica que PostgreSQL esté corriendo');
      console.log('   Windows: Get-Service postgresql*');
      console.log('   Linux: sudo systemctl status postgresql');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Solución: Verifica que el host en DATABASE_URL sea correcto');
    } else if (error.message.includes('password authentication failed')) {
      console.log('\n💡 Solución: Verifica usuario y contraseña en DATABASE_URL');
    } else if (error.message.includes('does not exist')) {
      console.log('\n💡 Solución: La base de datos no existe. Créala primero:');
      console.log('   createdb nombre_db');
    } else if (error.message.includes('SSL')) {
      console.log('\n💡 Solución: Problema con SSL. Verifica configuración SSL');
      console.log('   Puedes agregar ?sslmode=disable para desarrollo local');
    }
    
    process.exit(1);
  }
  
  // 4. Probar query a tabla del sistema
  console.log('\n4️⃣ Probando Acceso al Esquema ops:');
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.schemata 
        WHERE schema_name = 'ops'
      ) as schema_exists
    `);
    
    if (result.rows[0].schema_exists) {
      console.log('✅ Esquema "ops" existe');
      
      // Listar tablas en ops
      const tables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'ops'
        ORDER BY table_name
      `);
      
      if (tables.rows.length > 0) {
        console.log('   Tablas encontradas:', tables.rows.length);
        tables.rows.slice(0, 5).forEach(row => {
          console.log('   -', row.table_name);
        });
        if (tables.rows.length > 5) {
          console.log('   ... y', tables.rows.length - 5, 'más');
        }
      } else {
        console.log('⚠️ El esquema "ops" existe pero está vacío');
        console.log('💡 Ejecuta: psql -U usuario -d nombre_db -f scripts/create_full_database.sql');
      }
    } else {
      console.log('⚠️ El esquema "ops" no existe');
      console.log('💡 Ejecuta el script de creación de base de datos');
      console.log('   psql -U usuario -d nombre_db -f scripts/create_full_database.sql');
    }
  } catch (error) {
    console.error('❌ Error al verificar esquema:', error.message);
  }
  
  // 5. Verificar funciones SQL
  console.log('\n5️⃣ Verificando Funciones SQL:');
  try {
    const functions = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'ops'
      AND routine_type = 'FUNCTION'
      ORDER BY routine_name
    `);
    
    if (functions.rows.length > 0) {
      console.log('✅ Funciones encontradas:', functions.rows.length);
      functions.rows.forEach(row => {
        console.log('   -', row.routine_name);
      });
    } else {
      console.log('⚠️ No se encontraron funciones en ops');
    }
  } catch (error) {
    console.error('⚠️ No se pudieron verificar funciones:', error.message);
  }
  
  // 6. Estadísticas de conexiones
  console.log('\n6️⃣ Estadísticas de PostgreSQL:');
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
        (SELECT count(*) FROM pg_stat_activity) as active_connections,
        version() as version
    `);
    
    const max = stats.rows[0].max_connections;
    const active = stats.rows[0].active_connections;
    const usage = ((active / max) * 100).toFixed(1);
    
    console.log(`   Conexiones activas: ${active} / ${max} (${usage}%)`);
    
    if (usage > 80) {
      console.log('⚠️ Alto uso de conexiones. Considera aumentar max_connections');
    }
  } catch (error) {
    console.error('⚠️ No se pudieron obtener estadísticas:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Diagnóstico completado\n');
  
  // Cerrar el pool
  await pool.end();
  process.exit(0);
}

// Ejecutar diagnóstico
runDiagnostics().catch(error => {
  console.error('\n❌ Error fatal en diagnóstico:', error);
  process.exit(1);
});





