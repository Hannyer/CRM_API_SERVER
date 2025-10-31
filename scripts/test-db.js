// scripts/test-db.js
require('dotenv').config();
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { require: true, rejectUnauthorized: false },
  });

  console.log('>> DATABASE_URL present?', !!process.env.DATABASE_URL);

  try {
    const { rows } = await pool.query('select now() as now');
    console.log('✅ OK:', rows[0]);
  } catch (e) {
    console.error('❌ Falla conexión:', e);
  } finally {
    await pool.end();
  }
})();
