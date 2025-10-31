
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

module.exports = { getConfigList };