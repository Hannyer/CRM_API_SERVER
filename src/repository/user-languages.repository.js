const { pool } = require('../config/db.pg');

const LANGUAGE_JSON_AGG = `
  COALESCE(
    (
      SELECT json_agg(
        json_build_object('id', l.id, 'code', l.code, 'name', l.name)
        ORDER BY l.name
      )
      FROM ops.guide_language gl
      JOIN ops.language l ON l.id = gl.language_id
      WHERE gl.app_user_id = u.id
    ),
    '[]'::json
  ) AS languages
`;

async function countActiveLanguagesByIds(languageIds) {
  if (!languageIds.length) return 0;
  const { rows } = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM ops.language
    WHERE id = ANY($1::uuid[]) AND status = true
    `,
    [languageIds]
  );
  return rows[0].total;
}

async function setUserLanguages(appUserId, languageIds = []) {
  await pool.query(`DELETE FROM ops.guide_language WHERE app_user_id = $1::uuid`, [appUserId]);

  if (languageIds.length) {
    await pool.query(
      `
      INSERT INTO ops.guide_language (app_user_id, language_id)
      SELECT $1::uuid, UNNEST($2::uuid[])
      ON CONFLICT DO NOTHING
      `,
      [appUserId, languageIds]
    );
  }
}

async function deleteUserLanguages(appUserId) {
  await pool.query(`DELETE FROM ops.guide_language WHERE app_user_id = $1::uuid`, [appUserId]);
}

module.exports = {
  LANGUAGE_JSON_AGG,
  countActiveLanguagesByIds,
  setUserLanguages,
  deleteUserLanguages,
};
