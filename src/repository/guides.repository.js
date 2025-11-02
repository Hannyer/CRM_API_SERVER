const { pool } = require('../config/db.pg');

async function getAvailability({ date, activityTypeId = null, languageIds = [] }) {
  const { rows } = await pool.query(
    `SELECT * FROM ops.get_guides_availability($1::date, $2::uuid, $3::uuid[])`,
    [date, activityTypeId, languageIds.length ? languageIds : null]
  );
  return rows;
}

async function listGuides() {
  const { rows } = await pool.query(
    `SELECT id, name, email, phone, status, is_leader, max_party_size
     FROM ops.guide
     ORDER BY name`
  );
  return rows;
}

async function createGuide({ name, email, phone = null, isLeader = false, status = true, maxPartySize = null }) {
  const sql = `
    INSERT INTO ops.guide (name, email, phone, status, is_leader, max_party_size)
    VALUES ($1,   $2,    $3,    $4,     $5,        $6)
    RETURNING id, name, email, phone, status, is_leader, max_party_size;
  `;
  const params = [name, email, phone, status, isLeader, maxPartySize];
  const { rows } = await pool.query(sql, params);
  return rows[0];
}
async function setGuideLanguages(guideId, languageIds = []) {
  // Limpiamos y luego insertamos los nuevos
  await pool.query(`DELETE FROM ops.guide_language WHERE guide_id = $1`, [guideId]);

  if (languageIds.length) {
    // Inserción masiva con UNNEST
    await pool.query(
      `
      INSERT INTO ops.guide_language (guide_id, language_id)
      SELECT $1::uuid, UNNEST($2::uuid[])
      ON CONFLICT DO NOTHING
      `,
      [guideId, languageIds]
    );
  }

  // Devolvemos el guía con sus idiomas actuales
  const { rows } = await pool.query(
    `
    SELECT 
      g.id, g.name, g.email, g.phone, g.status, g.is_leader, g.max_party_size,
      COALESCE(
        (
          SELECT json_agg(json_build_object('id', l.id, 'code', l.code, 'name', l.name) ORDER BY l.name)
          FROM ops.guide_language gl
          JOIN ops.language l ON l.id = gl.language_id
          WHERE gl.guide_id = g.id
        ),
        '[]'::json
      ) AS languages
    FROM ops.guide g
    WHERE g.id = $1
    `,
    [guideId]
  );

  return rows[0];
}

module.exports = {
  getAvailability,
  listGuides,
  createGuide,
  setGuideLanguages,
};