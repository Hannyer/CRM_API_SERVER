const { pool } = require('../config/db.pg');

const ROLE_SELECT_FIELDS = `
  id,
  name,
  description,
  requires_license as "requiresLicense",
  requires_languages as "requiresLanguages",
  status,
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

async function listRoles({ page = 1, limit = 50, status = null } = {}) {
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
    `SELECT COUNT(*)::int as total FROM ops.role ${whereClause}`,
    params
  );
  const total = countResult.rows[0].total;

  const { rows } = await pool.query(
    `
    SELECT ${ROLE_SELECT_FIELDS}
    FROM ops.role
    ${whereClause}
    ORDER BY name ASC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `,
    [...params, limit, offset]
  );

  return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getRoleById(id) {
  const { rows } = await pool.query(
    `SELECT ${ROLE_SELECT_FIELDS} FROM ops.role WHERE id = $1::uuid`,
    [id]
  );
  return rows[0] || null;
}

async function existsActiveRoleById(id) {
  const { rows } = await pool.query(
    `
    SELECT 1 FROM ops.role
    WHERE id = $1::uuid AND status = true
    LIMIT 1
    `,
    [id]
  );
  return rows.length > 0;
}

async function listActiveRolesForSelect() {
  const { rows } = await pool.query(
    `
    SELECT id, name, description, requires_license as "requiresLicense", requires_languages as "requiresLanguages"
    FROM ops.role
    WHERE status = true
    ORDER BY name ASC
    `
  );
  return rows;
}

async function createRole({
  name,
  description = null,
  requiresLicense = false,
  requiresLanguages = false,
  status = true,
}) {
  const { rows } = await pool.query(
    `
    INSERT INTO ops.role (name, description, requires_license, requires_languages, status)
    VALUES (trim($1), $2, $3::bool, $4::bool, $5::bool)
    RETURNING ${ROLE_SELECT_FIELDS}
    `,
    [name, description, requiresLicense, requiresLanguages, status]
  );
  return rows[0];
}

async function updateRole(id, { name, description, requiresLicense, requiresLanguages, status }) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = trim($${paramIndex++})`);
    params.push(name);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(description);
  }
  if (requiresLicense !== undefined) {
    updates.push(`requires_license = $${paramIndex++}::bool`);
    params.push(requiresLicense);
  }
  if (requiresLanguages !== undefined) {
    updates.push(`requires_languages = $${paramIndex++}::bool`);
    params.push(requiresLanguages);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramIndex++}::bool`);
    params.push(status);
  }

  if (!updates.length) return getRoleById(id);

  updates.push('updated_at = now()');
  params.push(id);

  const { rows } = await pool.query(
    `
    UPDATE ops.role
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}::uuid
    RETURNING ${ROLE_SELECT_FIELDS}
    `,
    params
  );
  return rows[0] || null;
}

async function deleteRole(id) {
  const { rows } = await pool.query(
    `
    UPDATE ops.role
    SET status = false, updated_at = now()
    WHERE id = $1::uuid
    RETURNING ${ROLE_SELECT_FIELDS}
    `,
    [id]
  );
  return rows[0] || null;
}

async function countUsersByRoleId(roleId) {
  try {
    const { rows } = await pool.query(
      `
      SELECT COUNT(*)::int as total
      FROM ops.app_user
      WHERE role_id = $1::uuid
      `,
      [roleId]
    );
    return rows[0].total;
  } catch (e) {
    if (e.code === '42703') return 0;
    throw e;
  }
}

module.exports = {
  listRoles,
  getRoleById,
  existsActiveRoleById,
  listActiveRolesForSelect,
  createRole,
  updateRole,
  deleteRole,
  countUsersByRoleId,
};
