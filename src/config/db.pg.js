// src/config/db.pg.js
const { Pool } = require('pg');

const { databaseOptions } = require('./database-options');

const pool = new Pool({
  ...databaseOptions(),

  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  statement_timeout: 30000,
  query_timeout: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// EVENTOS
pool.on('connect', () => {
  console.log('✅ Nueva conexión a PostgreSQL establecida');
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
});

pool.on('remove', () => {
  console.log('🔌 Conexión removida del pool');
});

// TEST CONEXIÓN
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Conexión a PostgreSQL verificada:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Error al verificar conexión a PostgreSQL:', error.message);
    return false;
  }
}

// verificar al iniciar
if (process.env.VERIFY_DB_ON_START !== 'false') {
  testConnection().catch(err => {
    console.error('⚠️ No se pudo verificar la conexión inicial:', err.message);
  });
}

module.exports = { pool, testConnection };