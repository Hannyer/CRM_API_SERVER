// src/repository/activity-types.repository.js
const { pool } = require('../config/db.pg');

/**
 * Lista todos los tipos de actividad
 */
async function listActivityTypes() {
  const { rows } = await pool.query(
    `
    SELECT 
      id,
      code,
      name,
      description
    FROM ops.activity_type
    ORDER BY name ASC
    `
  );
  
  return rows;
}

/**
 * Obtiene un tipo de actividad por ID
 */
async function getActivityTypeById(activityTypeId) {
  const { rows } = await pool.query(
    `
    SELECT 
      id,
      code,
      name,
      description
    FROM ops.activity_type
    WHERE id = $1::uuid
    `,
    [activityTypeId]
  );

  return rows[0] || null;
}

module.exports = {
  listActivityTypes,
  getActivityTypeById,
};

