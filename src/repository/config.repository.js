
const { pool } = require('../config/db.pg');

async function getConfigList({
  opcion = 0,
  pkConfig = 0,
  description = '',
  key01 = '',
  key02 = '',
  key03 = '',
  key04 = '',
  key05 = '',
  key06 = '',
  value = '',
  page = 1,
  pageSize = 10,
  search = '',
  sort = 'PK_CONFIGURATION',
  order = 'asc',
}) {
  const sql = `
    SELECT
      "PK_CONFIGURATION" AS "pk_configuration",
      "ESTADO"           AS "estado",
      "DESCRIPTION"      AS "description",
      "OBSERVACION"      AS "observacion",
      "KEY01"            AS "key01",
      "KEY02"            AS "key02",
      "KEY03"            AS "key03",
      "KEY04"            AS "key04",
      "KEY05"            AS "key05",
      "KEY06"            AS "key06",
      "VALUE"            AS "value",
      "DisplayName"      AS "displayname",
      "TotalCount"       AS "totalcount"
    FROM dbo."PA_CON_TBL_MBR_CONFIGURACION"(
      $1::smallint,   -- p_opcion
      $2::bigint,     -- p_pk_config
      $3::varchar,    -- p_description
      $4::varchar,    -- p_key01
      $5::varchar,    -- p_key02
      $6::varchar,    -- p_key03
      $7::varchar,    -- p_key04
      $8::varchar,    -- p_key05
      $9::varchar,    -- p_key06
      $10::varchar,   -- p_value
      $11::int,       -- p_page
      $12::int,       -- p_pagesize
      $13::varchar,   -- p_search
      $14::varchar,   -- p_sort
      $15::varchar    -- p_order
    );
  `;

  const params = [
    opcion,
    pkConfig,
    description,
    key01,
    key02,
    key03,
    key04,
    key05,
    key06,
    value,
    page,
    pageSize,
    search ?? '',
    sort,
    order,
  ];

  const { rows } = await pool.query(sql, params);
  return rows;
}

async function listConfigurations({ page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;
  
  // Obtener el total de registros
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM dbo."CONFIGURATION"`
  );
  const total = parseInt(countResult.rows[0].total, 10);
  
  // Obtener los registros paginados
  const { rows } = await pool.query(
    `SELECT 
      "PK_CONFIGURATION" as "pkConfiguration",
      "ESTADO" as "estado",
      "DESCRIPTION" as "description",
      "OBSERVACION" as "observacion",
      "KEY01" as "key01",
      "KEY02" as "key02",
      "KEY03" as "key03",
      "KEY04" as "key04",
      "KEY05" as "key05",
      "KEY06" as "key06",
      "VALUE" as "value",
      "DisplayName" as "displayName"
     FROM dbo."CONFIGURATION"
     ORDER BY "PK_CONFIGURATION" DESC
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

async function createConfiguration({ 
  estado = 1, 
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
    INSERT INTO dbo."CONFIGURATION" 
      ("ESTADO", "DESCRIPTION", "OBSERVACION", "KEY01", "KEY02", "KEY03", "KEY04", "KEY05", "KEY06", "VALUE", "DisplayName")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING 
      "PK_CONFIGURATION" as "pkConfiguration",
      "ESTADO" as "estado",
      "DESCRIPTION" as "description",
      "OBSERVACION" as "observacion",
      "KEY01" as "key01",
      "KEY02" as "key02",
      "KEY03" as "key03",
      "KEY04" as "key04",
      "KEY05" as "key05",
      "KEY06" as "key06",
      "VALUE" as "value",
      "DisplayName" as "displayName";
  `;
  const params = [estado, description, observacion, key01, key02, key03, key04, key05, key06, value, displayName];
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

async function getConfigurationById(pkConfiguration) {
  const { rows } = await pool.query(
    `
    SELECT 
      "PK_CONFIGURATION" as "pkConfiguration",
      "ESTADO" as "estado",
      "DESCRIPTION" as "description",
      "OBSERVACION" as "observacion",
      "KEY01" as "key01",
      "KEY02" as "key02",
      "KEY03" as "key03",
      "KEY04" as "key04",
      "KEY05" as "key05",
      "KEY06" as "key06",
      "VALUE" as "value",
      "DisplayName" as "displayName"
    FROM dbo."CONFIGURATION"
    WHERE "PK_CONFIGURATION" = $1
    `,
    [pkConfiguration]
  );

  return rows[0] || null;
}

async function updateConfiguration(pkConfiguration, { 
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
    updates.push(`"ESTADO" = $${paramIndex++}`);
    params.push(estado);
  }
  if (description !== undefined) {
    updates.push(`"DESCRIPTION" = $${paramIndex++}`);
    params.push(description);
  }
  if (observacion !== undefined) {
    updates.push(`"OBSERVACION" = $${paramIndex++}`);
    params.push(observacion);
  }
  if (key01 !== undefined) {
    updates.push(`"KEY01" = $${paramIndex++}`);
    params.push(key01);
  }
  if (key02 !== undefined) {
    updates.push(`"KEY02" = $${paramIndex++}`);
    params.push(key02);
  }
  if (key03 !== undefined) {
    updates.push(`"KEY03" = $${paramIndex++}`);
    params.push(key03);
  }
  if (key04 !== undefined) {
    updates.push(`"KEY04" = $${paramIndex++}`);
    params.push(key04);
  }
  if (key05 !== undefined) {
    updates.push(`"KEY05" = $${paramIndex++}`);
    params.push(key05);
  }
  if (key06 !== undefined) {
    updates.push(`"KEY06" = $${paramIndex++}`);
    params.push(key06);
  }
  if (value !== undefined) {
    updates.push(`"VALUE" = $${paramIndex++}`);
    params.push(value);
  }
  if (displayName !== undefined) {
    updates.push(`"DisplayName" = $${paramIndex++}`);
    params.push(displayName);
  }

  if (updates.length === 0) {
    // Si no hay actualizaciones, devolvemos la configuración actual
    return getConfigurationById(pkConfiguration);
  }

  params.push(pkConfiguration);
  const sql = `
    UPDATE dbo."CONFIGURATION"
    SET ${updates.join(', ')}
    WHERE "PK_CONFIGURATION" = $${paramIndex}
    RETURNING 
      "PK_CONFIGURATION" as "pkConfiguration",
      "ESTADO" as "estado",
      "DESCRIPTION" as "description",
      "OBSERVACION" as "observacion",
      "KEY01" as "key01",
      "KEY02" as "key02",
      "KEY03" as "key03",
      "KEY04" as "key04",
      "KEY05" as "key05",
      "KEY06" as "key06",
      "VALUE" as "value",
      "DisplayName" as "displayName";
  `;

  const { rows } = await pool.query(sql, params);
  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

async function deleteConfiguration(pkConfiguration) {
  // Soft delete: cambiamos el estado a 0 (o el valor que represente eliminado)
  const { rows } = await pool.query(
    `
    UPDATE dbo."CONFIGURATION"
    SET "ESTADO" = 0
    WHERE "PK_CONFIGURATION" = $1
    RETURNING 
      "PK_CONFIGURATION" as "pkConfiguration",
      "ESTADO" as "estado",
      "DESCRIPTION" as "description",
      "OBSERVACION" as "observacion",
      "KEY01" as "key01",
      "KEY02" as "key02",
      "KEY03" as "key03",
      "KEY04" as "key04",
      "KEY05" as "key05",
      "KEY06" as "key06",
      "VALUE" as "value",
      "DisplayName" as "displayName";
    `,
    [pkConfiguration]
  );

  return rows[0] || null;
}

module.exports = { 
  getConfigList,
  listConfigurations,
  createConfiguration,
  getConfigurationById,
  updateConfiguration,
  deleteConfiguration,
};