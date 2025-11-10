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

/**
 * Obtiene todas las actividades programadas para una fecha específica
 * con información completa: tipo de actividad, horarios, guías asignados, idiomas, etc.
 */
async function getActivitiesByDate(date) {
  const { rows } = await pool.query(
    `
    SELECT 
      a.id,
      a.title,
      a.party_size as "partySize",
      a.scheduled_start as "scheduledStart",
      a.scheduled_end as "scheduledEnd",
      at.id as "activityTypeId",
      at.name as "activityTypeName",
      at.description as "activityTypeDescription",
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', g.id,
              'name', g.name,
              'email', g.email,
              'isLeader', aa.is_leader
            ) ORDER BY aa.is_leader DESC, g.name
          )
          FROM ops.activity_assignment aa
          JOIN ops.guide g ON g.id = aa.guide_id
          WHERE aa.activity_id = a.id
        ),
        '[]'::json
      ) AS guides,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', l.id,
              'code', l.code,
              'name', l.name
            ) ORDER BY l.name
          )
          FROM ops.activity_language al
          JOIN ops.language l ON l.id = al.language_id
          WHERE al.activity_id = a.id
        ),
        '[]'::json
      ) AS languages
    FROM ops.activity a
    JOIN ops.activity_type at ON at.id = a.activity_type_id
    WHERE DATE(a.scheduled_start) = $1::date
    ORDER BY a.scheduled_start ASC
    `,
    [date]
  );
  return rows;
}

/**
 * Lista todas las actividades con paginación
 */
async function listActivities({ page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;
  
  // Obtener el total de registros
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM ops.activity`
  );
  const total = parseInt(countResult.rows[0].total, 10);
  
  // Obtener los registros paginados
  const { rows } = await pool.query(
    `
    SELECT 
      a.id,
      a.title,
      a.party_size as "partySize",
      a.scheduled_start as "scheduledStart",
      a.scheduled_end as "scheduledEnd",
      at.id as "activityTypeId",
      at.name as "activityTypeName"
    FROM ops.activity a
    JOIN ops.activity_type at ON at.id = a.activity_type_id
    ORDER BY a.scheduled_start DESC
    LIMIT $1 OFFSET $2
    `,
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

/**
 * Obtiene una actividad por ID con información completa
 */
async function getActivityById(activityId) {
  const { rows } = await pool.query(
    `
    SELECT 
      a.id,
      a.title,
      a.party_size as "partySize",
      a.scheduled_start as "scheduledStart",
      a.scheduled_end as "scheduledEnd",
      at.id as "activityTypeId",
      at.name as "activityTypeName",
      at.description as "activityTypeDescription",
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', g.id,
              'name', g.name,
              'email', g.email,
              'isLeader', aa.is_leader
            ) ORDER BY aa.is_leader DESC, g.name
          )
          FROM ops.activity_assignment aa
          JOIN ops.guide g ON g.id = aa.guide_id
          WHERE aa.activity_id = a.id
        ),
        '[]'::json
      ) AS guides,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', l.id,
              'code', l.code,
              'name', l.name
            ) ORDER BY l.name
          )
          FROM ops.activity_language al
          JOIN ops.language l ON l.id = al.language_id
          WHERE al.activity_id = a.id
        ),
        '[]'::json
      ) AS languages
    FROM ops.activity a
    JOIN ops.activity_type at ON at.id = a.activity_type_id
    WHERE a.id = $1::uuid
    `,
    [activityId]
  );

  return rows[0] || null;
}

/**
 * Actualiza una actividad existente
 */
async function updateActivity(activityId, { activityTypeId, title, partySize, start, end }) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (activityTypeId !== undefined) {
    updates.push(`activity_type_id = $${paramIndex++}::uuid`);
    params.push(activityTypeId);
  }
  if (title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    params.push(title);
  }
  if (partySize !== undefined) {
    updates.push(`party_size = $${paramIndex++}::int`);
    params.push(partySize);
  }
  if (start !== undefined) {
    updates.push(`scheduled_start = $${paramIndex++}::timestamptz`);
    params.push(start);
  }
  if (end !== undefined) {
    updates.push(`scheduled_end = $${paramIndex++}::timestamptz`);
    params.push(end);
  }

  if (updates.length === 0) {
    // Si no hay actualizaciones, devolvemos la actividad actual
    return getActivityById(activityId);
  }

  params.push(activityId);
  const sql = `
    UPDATE ops.activity
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}::uuid
    RETURNING id, activity_type_id, title, party_size, scheduled_start, scheduled_end;
  `;

  const { rows } = await pool.query(sql, params);
  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

/**
 * Elimina una actividad (soft delete si hay campo status, o hard delete)
 * Por ahora haremos hard delete, pero se puede cambiar fácilmente
 */
async function deleteActivity(activityId) {
  // Primero eliminamos las relaciones
  await pool.query(`DELETE FROM ops.activity_assignment WHERE activity_id = $1::uuid`, [activityId]);
  await pool.query(`DELETE FROM ops.activity_language WHERE activity_id = $1::uuid`, [activityId]);
  
  // Luego eliminamos la actividad
  const { rows } = await pool.query(
    `DELETE FROM ops.activity WHERE id = $1::uuid RETURNING id, title`,
    [activityId]
  );

  return rows[0] || null;
}

module.exports = {
  createActivity,
  setActivityLanguages,
  insertAssignments,
  replaceAssignments,
  getGuidesAvailabilityByDate,
  getActivitiesByDate,
  listActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
};
