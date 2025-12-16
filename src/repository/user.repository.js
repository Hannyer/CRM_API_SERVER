
const { pool } = require('../config/db.pg');

async function getUsers({ email = '' }) {
  // Se usa consulta directa en lugar de SP
  const sql = `
    SELECT 
      id,
      email,
      full_name,
      password_hash,
      role,
      status,
      created_at
    FROM ops.app_user
    WHERE email = $1
  `;
  const params = [email];
  const { rows } = await pool.query(sql, params);
  return rows;
}

module.exports = { getUsers };
