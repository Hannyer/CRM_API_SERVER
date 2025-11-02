// src/repository/activities.repository.js
const { pool } = require('../config/db.pg');

/**
 * Crea la actividad dejando que Postgres genere el id (DEFAULT gen_random_uuid()).
 * Retorna el registro creado.
 */
async function createActivity({ activityTypeId, title, partySize, start, end }) {
  const sql = `
    INSERT INTO ops.activity (activity_type_id, title, party_size, scheduled_start, scheduled_end)
    VALUES ($1::uuid, $2, $3::int, $4::timestamptz, $5::timestamptz)
    RETURNING id, activity_type_id, title, party_size, scheduled_start, scheduled_end;
  `;
  const params = [activityTypeId, title, partySize, start, end];
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

/**
 * Reemplaza todos los idiomas de una actividad por los indicados.
 * Si languageIds está vacío, limpia la tabla puente.
 */
async function setActivityLanguages(activityId, languageIds = []) {
  await pool.query(
    `DELETE FROM ops.activity_language WHERE activity_id = $1::uuid`,
    [activityId]
  );

  if (languageIds.length) {
    await pool.query(
      `
      INSERT INTO ops.activity_language (activity_id, language_id)
      SELECT $1::uuid, UNNEST($2::uuid[])
      ON CONFLICT DO NOTHING;
      `,
      [activityId, languageIds]
    );
  }
}

/**
 * Inserta (append) asignaciones para una actividad.
 * Valida que no vengan >1 líderes en el payload.
 * (La BD debe tener un UNIQUE parcial para reforzar 1 líder por actividad).
 */
async function insertAssignments(activityId, assignments = []) {
  if (!assignments.length) return;

  const leaders = assignments.filter(a => a.isLeader);
  if (leaders.length > 1) {
    // coherente con el controller para devolver 409
    throw new Error('uq_one_leader_per_activity');
  }

  const guideIds  = assignments.map(a => a.guideId);
  const isLeaders = assignments.map(a => !!a.isLeader);

  await pool.query(
    `
    INSERT INTO ops.activity_assignment (activity_id, guide_id, is_leader)
    SELECT $1::uuid, UNNEST($2::uuid[]), UNNEST($3::bool[]);
    `,
    [activityId, guideIds, isLeaders]
  );
}

/**
 * Reemplaza completamente las asignaciones de una actividad.
 * Borra todo y vuelve a insertar lo recibido (si trae).
 */
async function replaceAssignments(activityId, assignments = []) {
  const leaders = assignments.filter(a => a.isLeader);
  if (leaders.length > 1) {
    throw new Error('uq_one_leader_per_activity');
  }

  await pool.query(
    `DELETE FROM ops.activity_assignment WHERE activity_id = $1::uuid`,
    [activityId]
  );

  if (assignments.length) {
    await insertAssignments(activityId, assignments);
  }
}

/**
 * Disponibilidad de guías por fecha/tipo/idiomas vía función SQL.
 * Si no hay idiomas, se envía NULL para permitir filtro opcional.
 */
async function getGuidesAvailabilityByDate({ date, activityTypeId = null, languageIds = [] }) {
  const { rows } = await pool.query(
    `SELECT * FROM ops.get_guides_availability($1::date, $2::uuid, $3::uuid[])`,
    [date, activityTypeId, languageIds.length ? languageIds : null]
  );
  return rows;
}

module.exports = {
  createActivity,
  setActivityLanguages,
  insertAssignments,
  replaceAssignments,
  getGuidesAvailabilityByDate,
};
