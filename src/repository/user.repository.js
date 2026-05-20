const { pool } = require('../config/db.pg');

const USER_SELECT_FIELDS = `
  id,
  cedula,
  email,
  full_name as "fullName",
  phone,
  role,
  license_expiration_date as "licenseExpirationDate",
  speaks_english as "speaksEnglish",
  status,
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

async function listUsers({ page = 1, limit = 10, status = null, role = null } = {}) {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (status !== null) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (role) {
    params.push(role);
    conditions.push(`role = $${params.length}::ops.app_user_role`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM ops.app_user ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  params.push(limit, offset);
  const limitParam = params.length - 1;
  const offsetParam = params.length;

  const { rows } = await pool.query(
    `
    SELECT ${USER_SELECT_FIELDS}
    FROM ops.app_user
    ${whereClause}
    ORDER BY full_name ASC
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

async function existsUserByCedula(cedula, excludeUserId = null) {
  const { rows } = await pool.query(
    `
    SELECT 1 FROM ops.app_user
    WHERE UPPER(TRIM(cedula)) = UPPER(TRIM($1))
      AND ($2::uuid IS NULL OR id <> $2)
    LIMIT 1
    `,
    [cedula, excludeUserId]
  );
  return rows.length > 0;
}

async function existsUserByEmail(email, excludeUserId = null) {
  const { rows } = await pool.query(
    `
    SELECT 1 FROM ops.app_user
    WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
      AND ($2::uuid IS NULL OR id <> $2)
    LIMIT 1
    `,
    [email, excludeUserId]
  );
  return rows.length > 0;
}

async function createUser({
  cedula,
  email,
  fullName,
  phone,
  passwordHash,
  role,
  licenseExpirationDate = null,
  speaksEnglish = false,
  status = true,
}) {
  const sql = `
    INSERT INTO ops.app_user (
      cedula, email, full_name, phone, password_hash, role,
      license_expiration_date, speaks_english, status
    )
    VALUES ($1, $2, $3, $4, $5, $6::ops.app_user_role, $7, $8, $9)
    RETURNING ${USER_SELECT_FIELDS};
  `;
  const { rows } = await pool.query(sql, [
    cedula,
    email,
    fullName,
    phone,
    passwordHash,
    role,
    licenseExpirationDate,
    speaksEnglish,
    status,
  ]);
  return rows[0];
}

async function getUserById(userId) {
  const { rows } = await pool.query(
    `
    SELECT ${USER_SELECT_FIELDS}
    FROM ops.app_user
    WHERE id = $1::uuid
    `,
    [userId]
  );
  return rows[0] || null;
}

async function getUserByEmail(email) {
  const { rows } = await pool.query(
    `
    SELECT
      id,
      cedula,
      email,
      full_name,
      phone,
      password_hash,
      role,
      license_expiration_date,
      speaks_english,
      status,
      created_at
    FROM ops.app_user
    WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
    LIMIT 1
    `,
    [email]
  );
  return rows[0] || null;
}

async function updateUser(userId, data) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  const fields = [
    ['cedula', 'cedula'],
    ['email', 'email'],
    ['fullName', 'full_name'],
    ['phone', 'phone'],
    ['passwordHash', 'password_hash'],
    ['licenseExpirationDate', 'license_expiration_date'],
    ['speaksEnglish', 'speaks_english'],
    ['status', 'status'],
  ];

  for (const [key, column] of fields) {
    if (data[key] !== undefined) {
      updates.push(`${column} = $${paramIndex++}`);
      params.push(data[key]);
    }
  }

  if (data.role !== undefined) {
    updates.push(`role = $${paramIndex++}::ops.app_user_role`);
    params.push(data.role);
  }

  if (updates.length === 0) {
    return getUserById(userId);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(userId);

  const sql = `
    UPDATE ops.app_user
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}::uuid
    RETURNING ${USER_SELECT_FIELDS};
  `;

  const { rows } = await pool.query(sql, params);
  return rows[0] || null;
}

async function deleteUser(userId) {
  const { rows } = await pool.query(
    `
    UPDATE ops.app_user
    SET status = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1::uuid
    RETURNING ${USER_SELECT_FIELDS};
    `,
    [userId]
  );
  return rows[0] || null;
}

module.exports = {
  listUsers,
  existsUserByCedula,
  existsUserByEmail,
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
};
