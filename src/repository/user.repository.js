
const { pool } = require('../config/db.pg');

async function getUsers({ opcion = 0, id = 0, user = '', email = '', role = 0, documentId = '' }) {
  const sql = `
    SELECT * FROM dbo."PA_CON_MBR_TBL_USER"(
      $1::int, $2::int, $3::varchar, $4::varchar, $5::int, $6::varchar
    );
  `;
  const params = [opcion, id, user, email, role, documentId];
  const { rows } = await pool.query(sql, params);
  return rows;
}

module.exports = { getUsers };
