const { pool } = require('../config/db.pg');

async function listLanguages({ page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;
  
  // Obtener el total de registros
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM ops.language`
  );
  const total = parseInt(countResult.rows[0].total, 10);
  
  // Obtener los registros paginados
  const { rows } = await pool.query(
    `SELECT id, code, name, status, created_at, updated_at
     FROM ops.language
     ORDER BY name
     LIMIT $1 OFFSET $2`,
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

async function createLanguage({ code, name, status = true }) {
  const sql = `
    INSERT INTO ops.language (code, name, status)
    VALUES ($1, $2, $3)
    RETURNING id, code, name, status, created_at, updated_at;
  `;
  const params = [code, name, status];
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

async function getLanguageById(languageId) {
  const { rows } = await pool.query(
    `
    SELECT id, code, name, status, created_at, updated_at
    FROM ops.language
    WHERE id = $1
    `,
    [languageId]
  );

  return rows[0] || null;
}

async function updateLanguage(languageId, { code, name, status }) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (code !== undefined) {
    updates.push(`code = $${paramIndex++}`);
    params.push(code);
  }
  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(name);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(status);
  }

  if (updates.length === 0) {
    // Si no hay actualizaciones, devolvemos el idioma actual
    return getLanguageById(languageId);
  }

  params.push(languageId);
  const sql = `
    UPDATE ops.language
    SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramIndex}
    RETURNING id, code, name, status, created_at, updated_at;
  `;

  const { rows } = await pool.query(sql, params);
  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

async function deleteLanguage(languageId) {
  // Soft delete: cambiamos el status a false
  const { rows } = await pool.query(
    `
    UPDATE ops.language
    SET status = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, code, name, status, created_at, updated_at;
    `,
    [languageId]
  );

  return rows[0] || null;
}

module.exports = {
  listLanguages,
  createLanguage,
  getLanguageById,
  updateLanguage,
  deleteLanguage,
};

