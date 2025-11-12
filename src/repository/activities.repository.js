// src/repository/activities.repository.js
const { pool } = require('../config/db.pg');

/**
 * Crea una actividad sin fechas (las fechas se agregan como planeaciones)
 * Retorna el registro creado.
 */
async function createActivity({ activityTypeId, title, partySize, status = true }) {
  const sql = `
    INSERT INTO ops.activity (activity_type_id, title, party_size, status)
    VALUES ($1::uuid, $2, $3::int, $4::bool)
    RETURNING id, activity_type_id as "activityTypeId", title, party_size as "partySize", status;
  `;
  const params = [activityTypeId, title, partySize, status];
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
 */
async function insertAssignments(activityId, assignments = []) {
  if (!assignments.length) return;

  const leaders = assignments.filter(a => a.isLeader);
  if (leaders.length > 1) {
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
 * usando las planeaciones (activity_schedule)
 */
async function getActivitiesByDate(date) {
  const { rows } = await pool.query(
    `
    SELECT 
      a.id,
      a.title,
      a.party_size as "partySize",
      a.status,
      s.id as "scheduleId",
      s.scheduled_start as "scheduledStart",
      s.scheduled_end as "scheduledEnd",
      s.status as "scheduleStatus",
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
    FROM ops.activity_schedule s
    JOIN ops.activity a ON a.id = s.activity_id
    JOIN ops.activity_type at ON at.id = a.activity_type_id
    WHERE DATE(s.scheduled_start) = $1::date
      AND s.status = true
      AND a.status = true
    ORDER BY s.scheduled_start ASC
    `,
    [date]
  );
  return rows;
}

/**
 * Lista todas las actividades con paginación (sin incluir planeaciones)
 */
async function listActivities({ page = 1, limit = 10, status = null } = {}) {
  const offset = (page - 1) * limit;
  
  let statusFilter = '';
  const params = [];
  let paramIndex = 1;

  if (status !== null) {
    statusFilter = `WHERE a.status = $${paramIndex++}::bool`;
    params.push(status);
  }

  // Obtener el total de registros
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM ops.activity a ${statusFilter}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);
  
  // Obtener los registros paginados
  const { rows } = await pool.query(
    `
    SELECT 
      a.id,
      a.title,
      a.party_size as "partySize",
      a.status,
      at.id as "activityTypeId",
      at.name as "activityTypeName",
      (
        SELECT COUNT(*) 
        FROM ops.activity_schedule s 
        WHERE s.activity_id = a.id AND s.status = true
      ) as "schedulesCount"
    FROM ops.activity a
    JOIN ops.activity_type at ON at.id = a.activity_type_id
    ${statusFilter}
    ORDER BY a.title ASC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `,
    [...params, limit, offset]
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
 * Obtiene una actividad por ID con información completa incluyendo planeaciones
 */
async function getActivityById(activityId) {
  const { rows } = await pool.query(
    `
    SELECT 
      a.id,
      a.title,
      a.party_size as "partySize",
      a.status,
      at.id as "activityTypeId",
      at.name as "activityTypeName",
      at.description as "activityTypeDescription",
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', s.id,
              'scheduledStart', s.scheduled_start,
              'scheduledEnd', s.scheduled_end,
              'status', s.status
            ) ORDER BY s.scheduled_start ASC
          )
          FROM ops.activity_schedule s
          WHERE s.activity_id = a.id
        ),
        '[]'::json
      ) AS schedules,
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
 * Actualiza una actividad existente (sin fechas, solo datos básicos)
 */
async function updateActivity(activityId, { activityTypeId, title, partySize, status }) {
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
  if (status !== undefined) {
    updates.push(`status = $${paramIndex++}::bool`);
    params.push(status);
  }

  if (updates.length === 0) {
    return getActivityById(activityId);
  }

  params.push(activityId);
  const sql = `
    UPDATE ops.activity
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}::uuid
    RETURNING id, activity_type_id as "activityTypeId", title, party_size as "partySize", status;
  `;

  const { rows } = await pool.query(sql, params);
  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

/**
 * Activa o inactiva una actividad
 */
async function toggleActivityStatus(activityId, status) {
  const { rows } = await pool.query(
    `
    UPDATE ops.activity
    SET status = $1::bool
    WHERE id = $2::uuid
    RETURNING id, activity_type_id as "activityTypeId", title, party_size as "partySize", status;
    `,
    [status, activityId]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

/**
 * Elimina una actividad (soft delete cambiando status a false)
 */
async function deleteActivity(activityId) {
  // Soft delete: cambiamos el status a false
  const { rows } = await pool.query(
    `
    UPDATE ops.activity
    SET status = false
    WHERE id = $1::uuid
    RETURNING id, title, status;
    `,
    [activityId]
  );

  return rows[0] || null;
}

// ========== FUNCIONES PARA PLANEACIONES (SCHEDULES) ==========

/**
 * Crea una nueva planeación para una actividad
 */
async function createSchedule(activityId, { scheduledStart, scheduledEnd, status = true }) {
  const sql = `
    INSERT INTO ops.activity_schedule (activity_id, scheduled_start, scheduled_end, status)
    VALUES ($1::uuid, $2::timestamptz, $3::timestamptz, $4::bool)
    RETURNING id, activity_id as "activityId", scheduled_start as "scheduledStart", 
               scheduled_end as "scheduledEnd", status;
  `;
  const params = [activityId, scheduledStart, scheduledEnd, status];
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

/**
 * Obtiene una planeación por ID
 */
async function getScheduleById(scheduleId) {
  const { rows } = await pool.query(
    `
    SELECT 
      s.id,
      s.activity_id as "activityId",
      s.scheduled_start as "scheduledStart",
      s.scheduled_end as "scheduledEnd",
      s.status,
      a.title as "activityTitle"
    FROM ops.activity_schedule s
    JOIN ops.activity a ON a.id = s.activity_id
    WHERE s.id = $1::uuid
    `,
    [scheduleId]
  );

  return rows[0] || null;
}

/**
 * Obtiene todas las planeaciones de una actividad
 */
async function getSchedulesByActivityId(activityId) {
  const { rows } = await pool.query(
    `
    SELECT 
      id,
      activity_id as "activityId",
      scheduled_start as "scheduledStart",
      scheduled_end as "scheduledEnd",
      status
    FROM ops.activity_schedule
    WHERE activity_id = $1::uuid
    ORDER BY scheduled_start ASC
    `,
    [activityId]
  );

  return rows;
}

/**
 * Actualiza una planeación
 */
async function updateSchedule(scheduleId, { scheduledStart, scheduledEnd, status }) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (scheduledStart !== undefined) {
    updates.push(`scheduled_start = $${paramIndex++}::timestamptz`);
    params.push(scheduledStart);
  }
  if (scheduledEnd !== undefined) {
    updates.push(`scheduled_end = $${paramIndex++}::timestamptz`);
    params.push(scheduledEnd);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramIndex++}::bool`);
    params.push(status);
  }

  if (updates.length === 0) {
    return getScheduleById(scheduleId);
  }

  params.push(scheduleId);
  const sql = `
    UPDATE ops.activity_schedule
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}::uuid
    RETURNING id, activity_id as "activityId", scheduled_start as "scheduledStart", 
               scheduled_end as "scheduledEnd", status;
  `;

  const { rows } = await pool.query(sql, params);
  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

/**
 * Elimina una planeación (soft delete)
 */
async function deleteSchedule(scheduleId) {
  const { rows } = await pool.query(
    `
    UPDATE ops.activity_schedule
    SET status = false
    WHERE id = $1::uuid
    RETURNING id, activity_id as "activityId";
    `,
    [scheduleId]
  );

  return rows[0] || null;
}

/**
 * Activa o inactiva una planeación
 */
async function toggleScheduleStatus(scheduleId, status) {
  const { rows } = await pool.query(
    `
    UPDATE ops.activity_schedule
    SET status = $1::bool
    WHERE id = $2::uuid
    RETURNING id, activity_id as "activityId", scheduled_start as "scheduledStart", 
               scheduled_end as "scheduledEnd", status;
    `,
    [status, scheduleId]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

module.exports = {
  // Actividades
  createActivity,
  setActivityLanguages,
  insertAssignments,
  replaceAssignments,
  getGuidesAvailabilityByDate,
  getActivitiesByDate,
  listActivities,
  getActivityById,
  updateActivity,
  toggleActivityStatus,
  deleteActivity,
  // Planeaciones
  createSchedule,
  getScheduleById,
  getSchedulesByActivityId,
  updateSchedule,
  deleteSchedule,
  toggleScheduleStatus,
};
