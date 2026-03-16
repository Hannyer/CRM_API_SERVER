const { pool } = require('../config/db.pg');

async function listPaymentTypes({ page = 1, limit = 50, status = null } = {}) {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (status !== null && status !== undefined) {
    conditions.push(`status = $${paramIndex++}::bool`);
    params.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM ops.payment_type ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const { rows } = await pool.query(
    `
    SELECT id, name, status, created_at as "createdAt", updated_at as "updatedAt"
    FROM ops.payment_type
    ${whereClause}
    ORDER BY name ASC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `,
    [...params, limit, offset]
  );

  return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getPaymentTypeById(id) {
  const { rows } = await pool.query(
    `SELECT id, name, status, created_at as "createdAt", updated_at as "updatedAt" FROM ops.payment_type WHERE id = $1::uuid`,
    [id]
  );
  return rows[0] || null;
}

async function createPaymentType({ name, status = true }) {
  const { rows } = await pool.query(
    `
    INSERT INTO ops.payment_type (name, status)
    VALUES ($1, $2::bool)
    RETURNING id, name, status, created_at as "createdAt", updated_at as "updatedAt"
    `,
    [name, status]
  );
  return rows[0];
}

async function updatePaymentType(id, { name, status }) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(name);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramIndex++}::bool`);
    params.push(status);
  }

  if (!updates.length) return getPaymentTypeById(id);

  updates.push(`updated_at = now()`);
  params.push(id);

  const { rows } = await pool.query(
    `
    UPDATE ops.payment_type
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}::uuid
    RETURNING id, name, status, created_at as "createdAt", updated_at as "updatedAt"
    `,
    params
  );
  return rows[0] || null;
}

async function deletePaymentType(id) {
  const { rows } = await pool.query(
    `
    UPDATE ops.payment_type
    SET status = false, updated_at = now()
    WHERE id = $1::uuid
    RETURNING id, name, status, created_at as "createdAt", updated_at as "updatedAt"
    `,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  listPaymentTypes,
  getPaymentTypeById,
  createPaymentType,
  updatePaymentType,
  deletePaymentType,
};

