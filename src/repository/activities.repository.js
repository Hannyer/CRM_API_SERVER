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
      s.capacity,
      s.booked_count as "bookedCount",
      (s.capacity - s.booked_count) as "availableSpots",
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
      at.description as "activityTypeDescription"
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
async function createSchedule(activityId, { scheduledStart, scheduledEnd, capacity = 0, status = true }) {
  const sql = `
    INSERT INTO ops.activity_schedule (activity_id, scheduled_start, scheduled_end, capacity, booked_count, status)
    VALUES ($1::uuid, $2::timestamptz, $3::timestamptz, $4::int, 0, $5::bool)
    RETURNING id, activity_id as "activityId", scheduled_start as "scheduledStart", 
               scheduled_end as "scheduledEnd", capacity, booked_count as "bookedCount", status;
  `;
  const params = [activityId, scheduledStart, scheduledEnd, capacity, status];
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
      s.capacity,
      s.booked_count as "bookedCount",
      (s.capacity - s.booked_count) as "availableSpots",
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
    s.id,
      s.activity_id as "activityId",
      s.scheduled_start as "scheduledStart",
      s.scheduled_end as "scheduledEnd",
      a.party_size as "capacity",

    COALESCE(b.total_booked, 0) AS "bookedCount",

    (a.party_size - COALESCE(b.total_booked, 0)) AS "availableSpots",

    s.status
FROM ops.activity_schedule s
INNER JOIN ops.activity a 
    ON a.id = s.activity_id
LEFT JOIN (
    SELECT 
        activity_schedule_id,
        SUM(number_of_people) AS total_booked
    FROM ops.booking
    where status != 'cancelled'
    GROUP BY activity_schedule_id
) b ON b.activity_schedule_id = s.id

WHERE s.activity_id = $1::uuid
ORDER BY s.scheduled_start ASC;
    `,
    [activityId]
  );

  return rows;
}

/**
 * Actualiza una planeación
 */
async function updateSchedule(scheduleId, { scheduledStart, scheduledEnd, capacity, status }) {
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
  if (capacity !== undefined) {
    updates.push(`capacity = $${paramIndex++}::int`);
    params.push(capacity);
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
               scheduled_end as "scheduledEnd", capacity, booked_count as "bookedCount", status;
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
               scheduled_end as "scheduledEnd", capacity, booked_count as "bookedCount", status;
    `,
    [status, scheduleId]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

// ========== NUEVAS FUNCIONES PARA CAPACIDAD Y RESERVAS ==========

/**
 * Inserción masiva de horarios para una actividad en un rango de fechas
 * @param {string} activityId - ID de la actividad
 * @param {Date|string} startDate - Fecha de inicio (YYYY-MM-DD)
 * @param {Date|string} endDate - Fecha de fin (YYYY-MM-DD)
 * @param {Array} timeSlots - Array de objetos con {startTime, endTime, capacity}
 * @param {boolean} validateOverlaps - Si true, valida solapamientos antes de insertar
 * @returns {Object} Resultado de la operación con createdCount o conflicts
 */
async function bulkCreateSchedules(activityId, startDate, endDate, timeSlots, validateOverlaps = true) {
  // Convertir fechas a formato YYYY-MM-DD si son objetos Date
  const startDateStr = startDate instanceof Date ? startDate.toISOString().split('T')[0] : startDate;
  const endDateStr = endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate;

  // Validar que timeSlots sea un array
  if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
    throw new Error('timeSlots debe ser un array no vacío');
  }

  // Validar formato de cada timeSlot
  for (const slot of timeSlots) {
    if (!slot.startTime || !slot.endTime) {
      throw new Error('Cada timeSlot debe tener startTime y endTime');
    }
  }

  const { rows } = await pool.query(
    `SELECT * FROM ops.bulk_create_schedules($1::uuid, $2::date, $3::date, $4::jsonb, $5::bool)`,
    [activityId, startDateStr, endDateStr, JSON.stringify(timeSlots), validateOverlaps]
  );

  const result = rows[0].bulk_create_schedules;
  
  if (!result.success) {
    const error = new Error(result.message || 'Error al crear horarios');
    error.code = result.error;
    error.conflicts = result.conflicts;
    throw error;
  }

  return result;
}

/**
 * Suma asistentes a un horario específico con bloqueo FOR UPDATE
 * @param {string} scheduleId - ID del horario
 * @param {number} quantity - Cantidad de asistentes a agregar
 * @returns {Object} Resultado con información actualizada del horario
 */
async function addAttendeesToSchedule(scheduleId, quantity) {
  if (!quantity || quantity <= 0) {
    throw new Error('La cantidad debe ser mayor a 0');
  }

  const { rows } = await pool.query(
    `SELECT * FROM ops.add_attendees_to_schedule($1::uuid, $2::int)`,
    [scheduleId, quantity]
  );

  const result = rows[0].add_attendees_to_schedule;

  if (!result.success) {
    const error = new Error(result.message || 'Error al agregar asistentes');
    error.code = result.error;
    error.currentBooked = result.currentBooked;
    error.capacity = result.capacity;
    error.available = result.available;
    error.requested = result.requested;
    throw error;
  }

  return result;
}

/**
 * Consulta disponibilidad de horarios
 * @param {Object} filters - Filtros opcionales {activityId, startDate, endDate}
 * @returns {Array} Array de horarios con información de disponibilidad
 */
async function getScheduleAvailability(filters = {}) {
  const { activityId = null, startDate = null, endDate = null } = filters;

  const { rows } = await pool.query(
    `SELECT * FROM ops.get_schedule_availability($1::uuid, $2::date, $3::date)`,
    [
      activityId || null,
      startDate || null,
      endDate || null
    ]
  );

  return rows.map(row => ({
    scheduleId: row.schedule_id,
    activityId: row.activity_id,
    activityTitle: row.activity_title,
    scheduledDate: row.scheduled_date,
    startTime: row.start_time,
    endTime: row.end_time,
    capacity: row.capacity,
    bookedCount: row.booked_count,
    availableSpots: row.available_spots,
    status: row.status
  }));
}

/**
 * Obtiene horarios disponibles por día para una actividad
 * @param {string} activityId - ID de la actividad
 * @param {Date|string} date - Fecha específica (YYYY-MM-DD)
 * @returns {Array} Array de horarios disponibles para ese día
 */
async function getAvailableSchedulesByDate(activityId, date) {
  const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;

  const { rows } = await pool.query(
    `
    SELECT 
      s.id,
      s.activity_id as "activityId",
      s.scheduled_start as "scheduledStart",
      s.scheduled_end as "scheduledEnd",
      s.capacity,
      s.booked_count as "bookedCount",
      (s.capacity - s.booked_count) as "availableSpots",
      s.status
    FROM ops.activity_schedule s
    WHERE s.activity_id = $1::uuid
      AND DATE(s.scheduled_start) = $2::date
      AND s.status = true
      AND (s.capacity - s.booked_count) > 0
    ORDER BY s.scheduled_start ASC
    `,
    [activityId, dateStr]
  );

  return rows;
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
  // Capacidad y reservas
  bulkCreateSchedules,
  addAttendeesToSchedule,
  getScheduleAvailability,
  getAvailableSchedulesByDate,
};
