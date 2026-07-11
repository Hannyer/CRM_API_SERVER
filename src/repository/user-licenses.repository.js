const { pool } = require('../config/db.pg');

const USER_LICENSE_JSON_AGG = `
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'licenseTypeId', lt.id,
          'licenseTypeName', lt.name,
          'expirationDate', ul.expiration_date
        )
        ORDER BY lt.name
      )
      FROM ops.app_user_license ul
      JOIN ops.license_type lt ON lt.id = ul.license_type_id
      WHERE ul.app_user_id = u.id
    ),
    '[]'::json
  ) AS licenses
`;

async function listActiveLicenseTypes() {
  const { rows } = await pool.query(
    `
    SELECT id, name, status
    FROM ops.license_type
    WHERE status = true
    ORDER BY name ASC
    `
  );
  return rows;
}

async function countActiveLicenseTypesByIds(licenseTypeIds) {
  if (!licenseTypeIds.length) return 0;
  const { rows } = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM ops.license_type
    WHERE id = ANY($1::uuid[]) AND status = true
    `,
    [licenseTypeIds]
  );
  return rows[0].total;
}

async function setUserLicenses(client, appUserId, licenses = []) {
  await client.query(`DELETE FROM ops.app_user_license WHERE app_user_id = $1::uuid`, [appUserId]);

  if (!licenses.length) return;

  const rows = licenses.map((item) => ({
    license_type_id: item.licenseTypeId,
    expiration_date: item.expirationDate,
  }));

  await client.query(
    `
    INSERT INTO ops.app_user_license (app_user_id, license_type_id, expiration_date)
    SELECT $1::uuid, item.license_type_id::uuid, item.expiration_date::date
    FROM jsonb_to_recordset($2::jsonb) AS item(license_type_id text, expiration_date text)
    ON CONFLICT (app_user_id, license_type_id) DO UPDATE SET
      expiration_date = EXCLUDED.expiration_date,
      updated_at = now()
    `,
    [appUserId, JSON.stringify(rows)]
  );
}

module.exports = {
  USER_LICENSE_JSON_AGG,
  listActiveLicenseTypes,
  countActiveLicenseTypesByIds,
  setUserLicenses,
};
