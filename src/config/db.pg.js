// src/config/db.pg.js
const { Pool } = require('pg');

// Determinar si debe usar SSL basado en el entorno y la URL de conexión
// Si es una base de datos remota (Render, etc.) puede requerir SSL
// Si es local, normalmente no requiere SSL
const getSSLConfig = () => {
  // Si DATABASE_URL contiene 'sslmode=require' o es una URL de Render/Heroku, usar SSL
  const dbUrl = process.env.DATABASE_URL || '';
  const isRemote = dbUrl.includes('render.com') || 
                   dbUrl.includes('herokuapp.com') || 
                   dbUrl.includes('sslmode=require') ||
                   process.env.NODE_ENV === 'production';
  
  if (isRemote) {
    return { require: true, rejectUnauthorized: false };
  }
  
  // Para desarrollo local, SSL es opcional
  // Si DATABASE_URL tiene parámetros SSL, respetarlos
  if (dbUrl.includes('sslmode=disable')) {
    return false;
  }
  
  // Por defecto, no forzar SSL en local
  return false;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getSSLConfig(),
  max: 20, // Aumentar el máximo de conexiones
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000, // Aumentar timeout de conexión
  statement_timeout: 30000, // Timeout para queries individuales
  query_timeout: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Manejo de eventos del pool
pool.on('connect', (client) => {
  console.log('✅ Nueva conexión a PostgreSQL establecida');
});

pool.on('error', (err, client) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
  // No cerrar el pool aquí, dejar que pg-pool lo maneje
});

pool.on('acquire', (client) => {
  // Opcional: log cuando se adquiere una conexión del pool
});

pool.on('remove', (client) => {
  console.log('🔌 Conexión removida del pool');
});

// Función para verificar la conexión
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Conexión a PostgreSQL verificada exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error al verificar conexión a PostgreSQL:', error.message);
    return false;
  }
}

// Verificar conexión al iniciar (opcional, puede comentarse si causa problemas)
if (process.env.VERIFY_DB_ON_START !== 'false') {
  testConnection().catch(err => {
    console.error('⚠️ No se pudo verificar la conexión inicial:', err.message);
  });
}

module.exports = { pool, testConnection };
