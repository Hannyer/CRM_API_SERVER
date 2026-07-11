const { pool } = require('../config/db.pg');
const { LANGUAGE_JSON_AGG } = require('./user-languages.repository');
const { USER_LICENSE_JSON_AGG, setUserLicenses } = require('./user-licenses.repository');

const USER_SELECT_FIELDS = `
  u.id,
  u.cedula,
  u.email,
  u.full_name as "fullName",
  u.phone,
  u.role_id as "roleId",
  r.name as "roleName",
  u.speaks_english as "speaksEnglish",
  u.status,
  u.created_at as "createdAt",
  u.updated_at as "updatedAt",
  ${LANGUAGE_JSON_AGG},
  ${USER_LICENSE_JSON_AGG}
`;

const USER_FROM_JOIN = `
  FROM ops.app_user u
  INNER JOIN ops.role r ON r.id = u.role_id
`;

async function listUsers({ page = 1, limit = 10, status = null, roleId = null } = {}) {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (status !== null) {
    params.push(status);
    conditions.push(`u.status = $${params.length}`);
  }
  if (roleId) {
    params.push(roleId);
    conditions.push(`u.role_id = $${params.length}::uuid`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) as total ${USER_FROM_JOIN} ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  params.push(limit, offset);
  const limitParam = params.length - 1;
  const offsetParam = params.length;

  const { rows } = await pool.query(
    `
    SELECT ${USER_SELECT_FIELDS}
    ${USER_FROM_JOIN}
    ${whereClause}
    ORDER BY u.full_name ASC
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
  roleId,
  speaksEnglish = false,
  status = true,
  languageIds = [],
  licenses = [],
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: inserted } = await client.query(
      `
      INSERT INTO ops.app_user (
        cedula, email, full_name, phone, password_hash, role_id,
        speaks_english, status
      )
      VALUES ($1, $2, $3, $4, $5, $6::uuid, $7, $8)
      RETURNING id;
      `,
      [
        cedula,
        email,
        fullName,
        phone,
        passwordHash,
        roleId,
        speaksEnglish,
        status,
      ]
    );

    const userId = inserted[0].id;

    if (languageIds.length) {
      await client.query(
        `
        INSERT INTO ops.guide_language (app_user_id, language_id)
        SELECT $1::uuid, UNNEST($2::uuid[])
        `,
        [userId, languageIds]
      );
    }

    await setUserLicenses(client, userId, licenses);

    await client.query('COMMIT');
    return getUserById(userId);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function getUserById(userId) {
  const { rows } = await pool.query(
    `
    SELECT ${USER_SELECT_FIELDS}
    ${USER_FROM_JOIN}
    WHERE u.id = $1::uuid
    `,
    [userId]
  );
  return rows[0] || null;
}

async function getUserByEmail(email) {
  const { rows } = await pool.query(
    `
    SELECT
      u.id,
      u.cedula,
      u.email,
      u.full_name,
      u.phone,
      u.password_hash,
      u.role_id,
      r.name as role_name,
      r.requires_license as role_requires_license,
      r.requires_languages as role_requires_languages,
      u.speaks_english,
      u.status,
      u.created_at
    ${USER_FROM_JOIN}
    WHERE LOWER(TRIM(u.email)) = LOWER(TRIM($1))
    LIMIT 1
    `,
    [email]
  );
  return rows[0] || null;
}

async function updateUser(userId, data) {
  const hasLanguageUpdate = data.languageIds !== undefined || data.clearLanguages;
  const hasLicenseUpdate = data.licenses !== undefined || data.clearLicenses;
  const updates = [];
  const params = [];
  let paramIndex = 1;

  const fields = [
    ['cedula', 'cedula'],
    ['email', 'email'],
    ['fullName', 'full_name'],
    ['phone', 'phone'],
    ['passwordHash', 'password_hash'],
    ['speaksEnglish', 'speaks_english'],
    ['status', 'status'],
  ];

  for (const [key, column] of fields) {
    if (data[key] !== undefined) {
      updates.push(`${column} = $${paramIndex++}`);
      params.push(data[key]);
    }
  }

  if (data.roleId !== undefined) {
    updates.push(`role_id = $${paramIndex++}::uuid`);
    params.push(data.roleId);
  }

  if (updates.length === 0 && !hasLanguageUpdate && !hasLicenseUpdate) {
    return getUserById(userId);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(userId);

      const { rows } = await client.query(
        `
        UPDATE ops.app_user
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}::uuid
        RETURNING id;
        `,
        params
      );

      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
    }

    if (data.languageIds !== undefined) {
      await client.query(`DELETE FROM ops.guide_language WHERE app_user_id = $1::uuid`, [
        userId,
      ]);
      if (data.languageIds.length) {
        await client.query(
          `
          INSERT INTO ops.guide_language (app_user_id, language_id)
          SELECT $1::uuid, UNNEST($2::uuid[])
          `,
          [userId, data.languageIds]
        );
      }
    } else if (data.clearLanguages) {
      await client.query(`DELETE FROM ops.guide_language WHERE app_user_id = $1::uuid`, [userId]);
    }

    if (data.licenses !== undefined) {
      await setUserLicenses(client, userId, data.licenses);
    } else if (data.clearLicenses) {
      await setUserLicenses(client, userId, []);
    }

    await client.query('COMMIT');
    return getUserById(userId);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function deleteUser(userId) {
  const { rows } = await pool.query(
    `
    UPDATE ops.app_user
    SET status = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1::uuid
    RETURNING id;
    `,
    [userId]
  );
  if (rows.length === 0) return null;
  return getUserById(userId);
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
