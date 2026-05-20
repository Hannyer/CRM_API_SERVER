const { pool } = require('../config/db.pg');

const ACTIVITY_TYPE_SELECT_FIELDS = `
  id,
  name,
  description,
  status,
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

async function listActivityTypes({ page = 1, limit = 10, status = null } = {}) {
  const offset = (page - 1) * limit;
  const params = [];
  let whereClause = '';

  if (status !== null) {
    params.push(status);
    whereClause = `WHERE status = $${params.length}`;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM ops.activity_type ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  params.push(limit, offset);
  const limitParam = params.length - 1;
  const offsetParam = params.length;

  const { rows } = await pool.query(
    `
    SELECT ${ACTIVITY_TYPE_SELECT_FIELDS}
    FROM ops.activity_type
    ${whereClause}
    ORDER BY name ASC
    LIMIT $${limitParam} OFFSET $${offsetParam}
    `,
    params
  );

  return {
    items: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function existsActivityTypeByName(name, excludeActivityTypeId = null) {
  const { rows } = await pool.query(
    `
    SELECT 1
    FROM ops.activity_type
    WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
      AND ($2::uuid IS NULL OR id <> $2)
    LIMIT 1
    `,
    [name, excludeActivityTypeId]
  );
  return rows.length > 0;
}

async function createActivityType({ name, description = null, status = true }) {
  const sql = `
    INSERT INTO ops.activity_type (name, description, status)
    VALUES ($1, $2, $3)
    RETURNING ${ACTIVITY_TYPE_SELECT_FIELDS};
  `;
  const { rows } = await pool.query(sql, [name, description, status]);
  return rows[0];
}

async function getActivityTypeById(activityTypeId) {
  const { rows } = await pool.query(
    `
    SELECT ${ACTIVITY_TYPE_SELECT_FIELDS}
    FROM ops.activity_type
    WHERE id = $1::uuid
    `,
    [activityTypeId]
  );

  return rows[0] || null;
}

async function updateActivityType(activityTypeId, { name, description, status }) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(name);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(description);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(status);
  }

  if (updates.length === 0) {
    return getActivityTypeById(activityTypeId);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(activityTypeId);

  const sql = `
    UPDATE ops.activity_type
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}::uuid
    RETURNING ${ACTIVITY_TYPE_SELECT_FIELDS};
  `;

  const { rows } = await pool.query(sql, params);
  return rows[0] || null;
}

async function deleteActivityType(activityTypeId) {
  const { rows } = await pool.query(
    `
    UPDATE ops.activity_type
    SET status = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1::uuid
    RETURNING ${ACTIVITY_TYPE_SELECT_FIELDS};
    `,
    [activityTypeId]
  );

  return rows[0] || null;
}

module.exports = {
  listActivityTypes,
  existsActivityTypeByName,
  createActivityType,
  getActivityTypeById,
  updateActivityType,
  deleteActivityType,
};
