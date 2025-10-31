// src/config/db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL // o usa PGHOST, PGUSER, etc.
  // ssl: { rejectUnauthorized: false } // <- si Render exige SSL
});

module.exports = { pool };
