
const { pool } = require('../config/db.pg');

async function getConfigList({
  opcion = 0,
  pkConfig = null, // Renamed param logic internally, but keeping interface flexible
  description = null,
  key01 = null,
  key02 = null,
  key03 = null,
  key04 = null,
  key05 = null,
  key06 = null,
  value = null,
  page = 1,
  pageSize = 10,
  search = null,
  sort = 'created_at',
  order = 'DESC',
}) {
  const sql = `
    SELECT
      id               AS "pk_configuration",   -- Alias for compatibility if needed, or update usage
      status           AS "estado",
      description      AS "description",
      observation      AS "observacion",
      key01            AS "key01",
      key02            AS "key02",
      key03            AS "key03",
      key04            AS "key04",
      key05            AS "key05",
      key06            AS "key06",
      value            AS "value",
      display_name     AS "displayname",
      total_count      AS "totalcount"
    FROM ops.get_configurations(
      $1::int, 
      $2::uuid, 
      $3::varchar, 
      $4::varchar, 
      $5::varchar, 
      $6::varchar, 
      $7::varchar, 
      $8::varchar, 
      $9::varchar, 
      $10::varchar, 
      $11::int, 
      $12::int, 
      $13::varchar, 
      $14::varchar, 
      $15::varchar
    );
  `;

  // Ensure params are null if empty string to match SP logic (optional, but safer)
  const p = [
    opcion,
    pkConfig || null,
    description || null,
    key01 || null,
    key02 || null,
    key03 || null,
    key04 || null,
    key05 || null,
    key06 || null,
    value || null,
    page,
    pageSize,
    search || null,
    sort,
    order,
  ];

  const { rows } = await pool.query(sql, p);
  return rows;
}

// Reuse getConfigList for the simplified list function or implement direct query
async function listConfigurations({ page = 1, limit = 10 } = {}) {
  // Using the new function directly
  const rows = await getConfigList({ page, pageSize: limit, sort: 'created_at', order: 'DESC' });

  const total = rows.length > 0 ? parseInt(rows[0].totalcount, 10) : 0;

  // Map to preserve legacy camelCase output matching original listConfigurations
  const items = rows.map(r => ({
    pkConfiguration: r.pk_configuration,
    estado: r.estado,
    description: r.description,
    observacion: r.observacion,
    key01: r.key01,
    key02: r.key02,
    key03: r.key03,
    key04: r.key04,
    key05: r.key05,
    key06: r.key06,
    value: r.value,
    displayName: r.displayname
  }));

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

async function createConfiguration({
  estado = 1, // 1=true, 0=false
  description = null,
  observacion = null,
  key01 = null,
  key02 = null,
  key03 = null,
  key04 = null,
  key05 = null,
  key06 = null,
  value = null,
  displayName = null
}) {
  const sql = `
    INSERT INTO ops.configuration 
      (status, description, observation, key01, key02, key03, key04, key05, key06, value, display_name)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING 
      id as "pkConfiguration",
      status as "estado",
      description as "description",
      observation as "observacion",
      key01 as "key01",
      key02 as "key02",
      key03 as "key03",
      key04 as "key04",
      key05 as "key05",
      key06 as "key06",
      value as "value",
      display_name as "displayName";
  `;
  const statusBool = (estado === 1 || estado === true);
  const params = [statusBool, description, observacion, key01, key02, key03, key04, key05, key06, value, displayName];
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

async function getConfigurationById(id) {
  const { rows } = await pool.query(
    `
    SELECT 
      id as "pkConfiguration",
      status as "estado",
      description as "description",
      observation as "observacion",
      key01 as "key01",
      key02 as "key02",
      key03 as "key03",
      key04 as "key04",
      key05 as "key05",
      key06 as "key06",
      value as "value",
      display_name as "displayName"
    FROM ops.configuration
    WHERE id = $1
    `,
    [id]
  );

  return rows[0] || null;
}

async function updateConfiguration(id, {
  estado,
  description,
  observacion,
  key01,
  key02,
  key03,
  key04,
  key05,
  key06,
  value,
  displayName
}) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (estado !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(estado === 1 || estado === true);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(description);
  }
  if (observacion !== undefined) {
    updates.push(`observation = $${paramIndex++}`);
    params.push(observacion);
  }
  if (key01 !== undefined) {
    updates.push(`key01 = $${paramIndex++}`);
    params.push(key01);
  }
  if (key02 !== undefined) {
    updates.push(`key02 = $${paramIndex++}`);
    params.push(key02);
  }
  if (key03 !== undefined) {
    updates.push(`key03 = $${paramIndex++}`);
    params.push(key03);
  }
  if (key04 !== undefined) {
    updates.push(`key04 = $${paramIndex++}`);
    params.push(key04);
  }
  if (key05 !== undefined) {
    updates.push(`key05 = $${paramIndex++}`);
    params.push(key05);
  }
  if (key06 !== undefined) {
    updates.push(`key06 = $${paramIndex++}`);
    params.push(key06);
  }
  if (value !== undefined) {
    updates.push(`value = $${paramIndex++}`);
    params.push(value);
  }
  if (displayName !== undefined) {
    updates.push(`display_name = $${paramIndex++}`);
    params.push(displayName);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  if (updates.length === 1) { // only updated_at
    return getConfigurationById(id);
  }

  params.push(id);
  const sql = `
    UPDATE ops.configuration
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING 
      id as "pkConfiguration",
      status as "estado",
      description as "description",
      observation as "observacion",
      key01 as "key01",
      key02 as "key02",
      key03 as "key03",
      key04 as "key04",
      key05 as "key05",
      key06 as "key06",
      value as "value",
      display_name as "displayName";
  `;

  const { rows } = await pool.query(sql, params);
  return rows[0] || null;
}

async function deleteConfiguration(id) {
  // Soft delete
  const { rows } = await pool.query(
    `
    UPDATE ops.configuration
    SET status = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING 
      id as "pkConfiguration",
      status as "estado",
      description as "description",
      observation as "observacion",
      key01 as "key01",
      key02 as "key02",
      key03 as "key03",
      key04 as "key04",
      key05 as "key05",
      key06 as "key06",
      value as "value",
      display_name as "displayName";
    `,
    [id]
  );

  return rows[0] || null;
}

async function listConfigurationsByKeys({
  key01 = null,
  key02 = null,
  key03 = null,
  key04 = null,
  key05 = null,
  key06 = null
} = {}) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (key01) { conditions.push(`key01 = $${paramIndex++}`); params.push(key01); }
  if (key02) { conditions.push(`key02 = $${paramIndex++}`); params.push(key02); }
  if (key03) { conditions.push(`key03 = $${paramIndex++}`); params.push(key03); }
  if (key04) { conditions.push(`key04 = $${paramIndex++}`); params.push(key04); }
  if (key05) { conditions.push(`key05 = $${paramIndex++}`); params.push(key05); }
  if (key06) { conditions.push(`key06 = $${paramIndex++}`); params.push(key06); }

  if (conditions.length === 0) return [];

  const whereClause = conditions.join(' AND ');

  const { rows } = await pool.query(
    `SELECT 
      id as "pkConfiguration",
      status as "estado",
      description as "description",
      observation as "observacion",
      key01 as "key01",
      key02 as "key02",
      key03 as "key03",
      key04 as "key04",
      key05 as "key05",
      key06 as "key06",
      value as "value",
      display_name as "displayName"
     FROM ops.configuration
     WHERE ${whereClause}
     ORDER BY created_at DESC`,
    params
  );

  return rows;
}

module.exports = {
  getConfigList,
  listConfigurations,
  listConfigurationsByKeys,
  createConfiguration,
  getConfigurationById,
  updateConfiguration,
  deleteConfiguration,
};