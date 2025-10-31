const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { require: true, rejectUnauthorized: false }, // Render exige TLS
  // opcional: idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('PG Pool error:', err);
});

module.exports = { pool };
