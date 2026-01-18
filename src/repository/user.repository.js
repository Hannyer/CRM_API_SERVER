
const { pool } = require('../config/db.pg');

/**
 * Obtiene todos los usuarios (con filtro opcional por email)
 * Útil para listado de usuarios
 */
async function getUsers({ email = '' } = {}) {
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
    WHERE ($1::text = '' OR email = $1)
    ORDER BY created_at DESC
  `;
  const params = [email];
  const { rows } = await pool.query(sql, params);
  return rows;
}

/**
 * Obtiene un usuario por email (optimizado para login)
 * Retorna un solo objeto o null si no existe
 */
async function getUserByEmail(email) {
  if (!email) return null;
  
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
    LIMIT 1
  `;
  const params = [email];
  const { rows } = await pool.query(sql, params);
  return rows[0] || null;
}

module.exports = { getUsers, getUserByEmail };
