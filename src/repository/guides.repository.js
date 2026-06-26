const { pool } = require('../config/db.pg');

async function getAvailability({ date, activityTypeId = null, languageIds = [] }) {
  const { rows } = await pool.query(
    `SELECT * FROM ops.get_guides_availability($1::date, $2::uuid, $3::uuid[])`,
    [date, activityTypeId, languageIds.length ? languageIds : null]
  );
  return rows;
}

async function listGuides({ page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;
  
  // Obtener el total de registros
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM ops.guide`
  );
  const total = parseInt(countResult.rows[0].total, 10);
  
  // NOTA: ops.guide_language ya no tiene columna guide_id (migrada a app_user_id).
  // Los idiomas ahora se gestionan desde ops.app_user con rol Guía.
  const { rows } = await pool.query(
    `
    SELECT 
      g.id, 
      g.name, 
      g.email, 
      g.phone, 
      g.status,
      '[]'::json AS languages
    FROM ops.guide g
    ORDER BY g.name
    LIMIT $1 OFFSET $2
    `,
    [limit, offset]
  );
  
  return {
    items: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

async function createGuide({ name, email, phone = null, status = true}) {
  const sql = `
    INSERT INTO ops.guide (name, email, phone, status)
    VALUES ($1,   $2,    $3,    $4)
    RETURNING id, name, email, phone, status;
  `;
  const params = [name, email, phone, status];
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

async function getGuideById(guideId) {
  const { rows } = await pool.query(
    `
    SELECT 
      g.id, g.name, g.email, g.phone, g.status,
      '[]'::json AS languages
    FROM ops.guide g
    WHERE g.id = $1
    `,
    [guideId]
  );

  return rows[0] || null;
}

async function updateGuide(guideId, { name, email, phone, status }) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(name);
  }
  if (email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    params.push(email);
  }
  if (phone !== undefined) {
    updates.push(`phone = $${paramIndex++}`);
    params.push(phone);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(status);
  }

  if (updates.length === 0) {
    return getGuideById(guideId);
  }

  params.push(guideId);
  const sql = `
    UPDATE ops.guide
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, name, email, phone, status;
  `;

  const { rows } = await pool.query(sql, params);
  if (rows.length === 0) {
    return null;
  }

  return getGuideById(guideId);
}

async function deleteGuide(guideId) {
  // Soft delete: cambiamos el status a false
  // NOTA: guide_language ya no tiene columna guide_id, no hay idiomas que limpiar aqui
  const { rows } = await pool.query(
    `
    UPDATE ops.guide
    SET status = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, name, email, phone, status;
    `,
    [guideId]
  );
  return rows[0] || null;
}

async function setGuideLanguages(guideId, languageIds = []) {
  // NOTA: ops.guide_language ya no tiene columna guide_id.
  // Los idiomas de guias ahora se gestionan desde ops.app_user (ver user-languages.repository.js).
  // Esta funcion retorna el guia sin modificar idiomas.
  return getGuideById(guideId);
}

module.exports = {
  getAvailability,
  listGuides,
  createGuide,
  getGuideById,
  updateGuide,
  deleteGuide,
  setGuideLanguages,
};