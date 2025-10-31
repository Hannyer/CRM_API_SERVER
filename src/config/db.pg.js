// src/config/db.pg.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { require: true, rejectUnauthorized: false },
  keepAlive: true,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('connect', () => console.log('✅ PG pool conectado'));
pool.on('error', (err) => console.error('❌ PG pool error', err));

module.exports = { pool };
