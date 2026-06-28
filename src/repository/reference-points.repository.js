const { pool } = require('../config/db.pg');

const REFERENCE_POINT_SELECT = `
  rp.id,
  rp.description,
  rp.status,
  rp.created_at AS "createdAt",
  rp.updated_at AS "updatedAt",
  rp.created_by AS "createdBy",
  rp.updated_by AS "updatedBy",
  cu.full_name AS "createdByName",
  uu.full_name AS "updatedByName"
`;

const REFERENCE_POINT_FROM = `
  FROM ops.reference_point rp
  LEFT JOIN ops.app_user cu ON cu.id = rp.created_by
  LEFT JOIN ops.app_user uu ON uu.id = rp.updated_by
`;

async function listReferencePoints({ page = 1, limit = 10, status = null } = {}) {
  const offset = (page - 1) * limit;
  const params = [];
  let whereClause = '';

  if (status !== null && status !== undefined) {
    params.push(status);
    whereClause = `WHERE rp.status = $${params.length}::bool`;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM ops.reference_point rp ${whereClause}`,
    params
  );
  const total = countResult.rows[0].total;

  params.push(limit, offset);
  const limitParam = params.length - 1;
  const offsetParam = params.length;

  const { rows } = await pool.query(
    `
    SELECT ${REFERENCE_POINT_SELECT}
    ${REFERENCE_POINT_FROM}
    ${whereClause}
    ORDER BY rp.created_at DESC
    LIMIT $${limitParam} OFFSET $${offsetParam}
    `,
    params
  );

  return {
    items: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 0,
  };
}

async function getReferencePointById(id) {
  const { rows } = await pool.query(
    `
    SELECT ${REFERENCE_POINT_SELECT}
    ${REFERENCE_POINT_FROM}
    WHERE rp.id = $1::uuid
    `,
    [id]
  );
  return rows[0] || null;
}

async function createReferencePoint({ description, status = true, userId = null }) {
  const { rows } = await pool.query(
    `
    INSERT INTO ops.reference_point (description, status, created_by, updated_by)
    VALUES (trim($1), $2::bool, $3::uuid, $3::uuid)
    RETURNING id
    `,
    [description, status, userId]
  );
  return getReferencePointById(rows[0].id);
}

async function updateReferencePoint(id, { description, status, userId = null }) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (description !== undefined) {
    updates.push(`description = trim($${paramIndex++})`);
    params.push(description);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramIndex++}::bool`);
    params.push(status);
  }

  if (updates.length === 0) {
    return getReferencePointById(id);
  }

  if (userId) {
    updates.push(`updated_by = $${paramIndex++}::uuid`);
    params.push(userId);
  }

  params.push(id);

  const { rows } = await pool.query(
    `
    UPDATE ops.reference_point
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}::uuid
    RETURNING id
    `,
    params
  );

  if (!rows.length) return null;
  return getReferencePointById(rows[0].id);
}

/** Soft delete: desactiva el punto de referencia */
async function deleteReferencePoint(id, userId = null) {
  const { rows } = await pool.query(
    `
    UPDATE ops.reference_point
    SET status = false,
        updated_by = COALESCE($2::uuid, updated_by)
    WHERE id = $1::uuid
    RETURNING id
    `,
    [id, userId]
  );

  if (!rows.length) return null;
  return getReferencePointById(rows[0].id);
}

module.exports = {
  listReferencePoints,
  getReferencePointById,
  createReferencePoint,
  updateReferencePoint,
  deleteReferencePoint,
};
