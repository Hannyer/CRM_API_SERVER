// src/repository/booking-assignments.repository.js
const { pool } = require('../config/db.pg');
const { ROLE_IDS } = require('../constants/roleIds');

const GUIDE_ROLE_ID = ROLE_IDS.GUIA;

/**
 * Obtiene los guías y transporte asignados a una reserva
 */
async function getAssignmentsByBookingId(bookingId) {
  // Guías asignados
  const { rows: guides } = await pool.query(
    `
    SELECT
      asg.id as "assignmentId",
      u.id,
      u.full_name as "fullName",
      u.email,
      u.phone,
      u.status,
      asg.created_at as "assignedAt"
    FROM ops.booking b
    JOIN ops.activity_schedule_guide asg ON asg.activity_schedule_id = b.activity_schedule_id
    JOIN ops.app_user u ON u.id = asg.guide_id
    WHERE b.id = $1::uuid
    ORDER BY asg.created_at ASC
    `,
    [bookingId]
  );

  // Transporte asignado
  const { rows: transports } = await pool.query(
    `
    SELECT
      bt.id as "assignmentId",
      t.id,
      t.model,
      t.capacity,
      t.license_plate as "licensePlate",
      t.operational_status as "operationalStatus",
      bt.created_at as "assignedAt",
      bt.reference_point_id as "referencePointId",
      rp.description as "referencePointDescription",
      bt.pickup_at as "pickupAt",
      d.id as "driverId",
      d.full_name as "driverName",
      d.email as "driverEmail",
      d.phone as "driverPhone"
    FROM ops.booking_transport bt
    JOIN ops.transport t ON t.id = bt.transport_id
    LEFT JOIN ops.app_user d ON d.id = bt.driver_id
    LEFT JOIN ops.reference_point rp ON rp.id = bt.reference_point_id
    WHERE bt.booking_id = $1::uuid
    `,
    [bookingId]
  );

  return {
    guides,
    transport: transports[0] || null,
  };
}

/**
 * Lista guías activos con disponibilidad respecto a una salida (schedule).
 * isAvailable = sin cruce de horario en otra salida activa.
 */
async function getGuidesWithScheduleAvailability(activityScheduleId) {
  const { rows } = await pool.query(
    `
    WITH target_schedule AS (
      SELECT id, scheduled_start, scheduled_end
      FROM ops.activity_schedule
      WHERE id = $2::uuid
    ),
    assigned_here AS (
      SELECT asg.guide_id
      FROM ops.activity_schedule_guide asg
      WHERE asg.activity_schedule_id = $2::uuid
    )
    SELECT
      u.id,
      u.full_name as "fullName",
      u.email,
      u.phone,
      u.status,
      u.speaks_english as "speaksEnglish",
      EXISTS (SELECT 1 FROM assigned_here ah WHERE ah.guide_id = u.id) AS "isAssignedToSchedule",
      (
        SELECT json_build_object(
          'activityScheduleId', s.id,
          'activityTitle', a.title,
          'scheduledStart', s.scheduled_start,
          'scheduledEnd', s.scheduled_end
        )
        FROM ops.activity_schedule_guide asg
        JOIN ops.activity_schedule s ON s.id = asg.activity_schedule_id
        JOIN ops.activity a ON a.id = s.activity_id
        CROSS JOIN target_schedule ts
        WHERE asg.guide_id = u.id
          AND s.id <> ts.id
          AND s.status = true
          AND s.scheduled_start < ts.scheduled_end
          AND s.scheduled_end > ts.scheduled_start
        ORDER BY s.scheduled_start ASC
        LIMIT 1
      ) AS "scheduleConflict",
      COALESCE(
        (
          SELECT json_agg(json_build_object('id', l.id, 'code', l.code, 'name', l.name) ORDER BY l.name)
          FROM ops.guide_language gl
          JOIN ops.language l ON l.id = gl.language_id
          WHERE gl.app_user_id = u.id
        ),
        '[]'::json
      ) AS languages
    FROM ops.app_user u
    INNER JOIN ops.role r ON r.id = u.role_id
    CROSS JOIN target_schedule ts
    WHERE r.id = $1::uuid
      AND u.status = true
    ORDER BY u.full_name ASC
    `,
    [GUIDE_ROLE_ID, activityScheduleId]
  );

  return rows.map((row) => ({
    ...row,
    isAvailable: row.scheduleConflict == null,
  }));
}

/**
 * Lista los usuarios con rol Guía activos disponibles para asignar
 */
async function getAvailableGuides(bookingId = null) {
  if (!bookingId) {
    const { rows } = await pool.query(
      `
      SELECT
        u.id,
        u.full_name as "fullName",
        u.email,
        u.phone,
        u.status,
        u.speaks_english as "speaksEnglish",
        true AS "isAvailable",
        false AS "isAssignedToSchedule",
        NULL::json AS "scheduleConflict",
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', l.id, 'code', l.code, 'name', l.name) ORDER BY l.name)
            FROM ops.guide_language gl
            JOIN ops.language l ON l.id = gl.language_id
            WHERE gl.app_user_id = u.id
          ),
          '[]'::json
        ) AS languages
      FROM ops.app_user u
      INNER JOIN ops.role r ON r.id = u.role_id
      WHERE r.id = $1::uuid
        AND u.status = true
      ORDER BY u.full_name ASC
      `,
      [GUIDE_ROLE_ID]
    );
    return rows;
  }

  const { rows: bookings } = await pool.query(
    `SELECT activity_schedule_id AS "activityScheduleId" FROM ops.booking WHERE id = $1::uuid`,
    [bookingId]
  );
  const activityScheduleId = bookings[0]?.activityScheduleId;
  if (!activityScheduleId) {
    return [];
  }

  return getGuidesWithScheduleAvailability(activityScheduleId);
}

async function getAvailableDrivers() {
  const { rows } = await pool.query(
    `
    SELECT id, full_name as "fullName", email, phone, status
    FROM ops.app_user
    WHERE role_id = $1::uuid
      AND status = true
    ORDER BY full_name ASC
    `,
    [ROLE_IDS.CONDUCTOR]
  );
  return rows;
}

async function getAvailableGuidesByScheduleId(activityScheduleId) {
  const { rows: schedules } = await pool.query(
    `SELECT id FROM ops.activity_schedule WHERE id = $1::uuid`,
    [activityScheduleId]
  );
  if (!schedules.length) {
    return null;
  }

  return getGuidesWithScheduleAvailability(activityScheduleId);
}

async function activityScheduleExists(activityScheduleId) {
  const { rows } = await pool.query(
    `SELECT id FROM ops.activity_schedule WHERE id = $1::uuid`,
    [activityScheduleId]
  );
  return rows.length > 0;
}

async function listScheduleGuideAssignments() {
  const { rows } = await pool.query(
    `
    SELECT
      s.id as "activityScheduleId",
      a.id as "activityId",
      a.title as "activityTitle",
      s.scheduled_start as "scheduledStart",
      s.scheduled_end as "scheduledEnd",
      COALESCE(b.booking_count, 0) as "bookingCount",
      COALESCE(b.total_people, 0) as "totalPeople",
      COALESCE(
        json_agg(
          json_build_object(
            'assignmentId', asg.id,
            'id', u.id,
            'fullName', u.full_name,
            'email', u.email,
            'phone', u.phone,
            'status', u.status,
            'assignedAt', asg.created_at
          ) ORDER BY u.full_name
        ) FILTER (WHERE u.id IS NOT NULL),
        '[]'::json
      ) as guides
    FROM ops.activity_schedule s
    JOIN ops.activity a ON a.id = s.activity_id
    LEFT JOIN ops.activity_schedule_guide asg ON asg.activity_schedule_id = s.id
    LEFT JOIN ops.app_user u ON u.id = asg.guide_id
    JOIN (
      SELECT
        activity_schedule_id,
        COUNT(*)::int as booking_count,
        COALESCE(SUM(number_of_people), 0)::int as total_people
      FROM ops.booking
      WHERE status IN ('pending', 'confirmed')
      GROUP BY activity_schedule_id
    ) b ON b.activity_schedule_id = s.id
    WHERE s.scheduled_start::date >= CURRENT_DATE
      AND s.status = true
    GROUP BY s.id, a.id, a.title, s.scheduled_start, s.scheduled_end, b.booking_count, b.total_people
    ORDER BY s.scheduled_start ASC
    `
  );
  return rows;
}

async function setScheduleGuides(activityScheduleId, guideIds = []) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `DELETE FROM ops.activity_schedule_guide WHERE activity_schedule_id = $1::uuid`,
      [activityScheduleId]
    );

    if (guideIds.length > 0) {
      await client.query(
        `
        INSERT INTO ops.activity_schedule_guide (activity_schedule_id, guide_id)
        SELECT $1::uuid, UNNEST($2::uuid[])
        ON CONFLICT DO NOTHING
        `,
        [activityScheduleId, guideIds]
      );
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function listBookingTransportAssignments() {
  const { rows } = await pool.query(
    `
    SELECT
      b.id as "bookingId",
      b.customer_name as "customerName",
      b.number_of_people as "numberOfPeople",
      b.status,
      a.title as "activityTitle",
      s.scheduled_start as "scheduledStart",
      s.scheduled_end as "scheduledEnd",
      bt.id as "assignmentId",
      t.id as "transportId",
      t.model,
      t.capacity,
      t.license_plate as "licensePlate",
      t.operational_status as "operationalStatus",
      bt.created_at as "assignedAt",
      bt.reference_point_id as "referencePointId",
      rp.description as "referencePointDescription",
      bt.pickup_at as "pickupAt",
      d.id as "driverId",
      d.full_name as "driverName",
      d.email as "driverEmail",
      d.phone as "driverPhone"
    FROM ops.booking b
    JOIN ops.activity_schedule s ON s.id = b.activity_schedule_id
    JOIN ops.activity a ON a.id = s.activity_id
    JOIN ops.booking_transport bt ON bt.booking_id = b.id
    JOIN ops.transport t ON t.id = bt.transport_id
    LEFT JOIN ops.app_user d ON d.id = bt.driver_id
    LEFT JOIN ops.reference_point rp ON rp.id = bt.reference_point_id
    WHERE b.transport = true
      AND b.status IN ('pending', 'confirmed')
    ORDER BY s.scheduled_start ASC, b.customer_name ASC
    `
  );
  return rows;
}

/**
 * Asigna guías a una reserva (reemplaza los existentes).
 * Máximo 5 guías.
 */
async function setBookingGuides(bookingId, guideIds = []) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: bookings } = await client.query(
      `SELECT activity_schedule_id as "activityScheduleId" FROM ops.booking WHERE id = $1::uuid`,
      [bookingId]
    );
    const activityScheduleId = bookings[0]?.activityScheduleId;
    if (!activityScheduleId) {
      await client.query('ROLLBACK');
      return getAssignmentsByBookingId(bookingId);
    }

    // Limpiar asignaciones anteriores
    await client.query(
      `DELETE FROM ops.activity_schedule_guide WHERE activity_schedule_id = $1::uuid`,
      [activityScheduleId]
    );

    // Insertar nuevas asignaciones
    if (guideIds.length > 0) {
      await client.query(
        `
        INSERT INTO ops.activity_schedule_guide (activity_schedule_id, guide_id)
        SELECT $1::uuid, UNNEST($2::uuid[])
        ON CONFLICT DO NOTHING
        `,
        [activityScheduleId, guideIds]
      );
    }

    await client.query('COMMIT');
    return getAssignmentsByBookingId(bookingId);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Asigna un transporte a una reserva. Si transportId es null, elimina la asignación.
 */
async function setBookingTransport(bookingId, transportId, driverId = null, referencePointId = null, pickupAt = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Eliminar asignación anterior
    await client.query(
      `DELETE FROM ops.booking_transport WHERE booking_id = $1::uuid`,
      [bookingId]
    );

    // Insertar nueva asignación si se proporciona transportId
    if (transportId) {
      await client.query(
        `
        INSERT INTO ops.booking_transport (booking_id, transport_id, driver_id, reference_point_id, pickup_at)
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::timestamptz)
        ON CONFLICT DO NOTHING
        `,
        [bookingId, transportId, driverId, referencePointId, pickupAt]
      );
    }

    await client.query('COMMIT');
    return getAssignmentsByBookingId(bookingId);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function listGuideAssignmentsByUser(userId, { startDateTime = null, endDateTime = null } = {}) {
  const { rows } = await pool.query(
    `
    SELECT
      s.id as "activityScheduleId",
      a.title as "activityTitle",
      s.scheduled_start as "scheduledStart",
      s.scheduled_end as "scheduledEnd",
      COALESCE(b.booking_count, 0)::int as "bookingCount",
      COALESCE(b.total_people, 0)::int as "totalPeople"
    FROM ops.activity_schedule_guide asg
    JOIN ops.activity_schedule s ON s.id = asg.activity_schedule_id
    JOIN ops.activity a ON a.id = s.activity_id
    LEFT JOIN (
      SELECT activity_schedule_id, COUNT(*) as booking_count, SUM(number_of_people) as total_people
      FROM ops.booking
      WHERE status IN ('pending', 'confirmed')
      GROUP BY activity_schedule_id
    ) b ON b.activity_schedule_id = s.id
    WHERE asg.guide_id = $1::uuid
      AND s.scheduled_start >= COALESCE($2::timestamptz, CURRENT_DATE::timestamptz)
      AND s.scheduled_start < COALESCE($3::timestamptz, (CURRENT_DATE + INTERVAL '1 day')::timestamptz)
      AND s.status = true
    ORDER BY s.scheduled_start ASC
    `,
    [userId, startDateTime, endDateTime]
  );
  return rows;
}

async function listDriverAssignmentsByUser(userId, { startDateTime = null, endDateTime = null } = {}) {
  const { rows } = await pool.query(
    `
    SELECT
      b.id as "bookingId",
      b.customer_name as "customerName",
      b.customer_phone as "customerPhone",
      b.number_of_people as "numberOfPeople",
      b.status,
      a.title as "activityTitle",
      s.scheduled_start as "scheduledStart",
      s.scheduled_end as "scheduledEnd",
      t.id as "transportId",
      t.model,
      t.capacity,
      t.license_plate as "licensePlate",
      bt.reference_point_id as "referencePointId",
      rp.description as "referencePointDescription",
      bt.pickup_at as "pickupAt"
    FROM ops.booking_transport bt
    JOIN ops.booking b ON b.id = bt.booking_id
    JOIN ops.activity_schedule s ON s.id = b.activity_schedule_id
    JOIN ops.activity a ON a.id = s.activity_id
    JOIN ops.transport t ON t.id = bt.transport_id
    LEFT JOIN ops.reference_point rp ON rp.id = bt.reference_point_id
    WHERE bt.driver_id = $1::uuid
      AND b.status IN ('pending', 'confirmed')
      AND COALESCE(bt.pickup_at, s.scheduled_start) >= COALESCE($2::timestamptz, CURRENT_DATE::timestamptz)
      AND COALESCE(bt.pickup_at, s.scheduled_start) < COALESCE($3::timestamptz, (CURRENT_DATE + INTERVAL '1 day')::timestamptz)
    ORDER BY COALESCE(bt.pickup_at, s.scheduled_start) ASC
    `,
    [userId, startDateTime, endDateTime]
  );
  return rows;
}

/**
 * Confirma una reserva: cambia su status a 'confirmed'
 */
async function confirmBooking(bookingId) {
  const { rows } = await pool.query(
    `
    UPDATE ops.booking
    SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
    WHERE id = $1::uuid
      AND status = 'pending'
    RETURNING
      id,
      status,
      updated_at as "updatedAt"
    `,
    [bookingId]
  );
  return rows[0] || null;
}

module.exports = {
  getAssignmentsByBookingId,
  getAvailableGuides,
  getAvailableDrivers,
  getAvailableGuidesByScheduleId,
  getGuidesWithScheduleAvailability,
  activityScheduleExists,
  listScheduleGuideAssignments,
  listBookingTransportAssignments,
  setBookingGuides,
  setScheduleGuides,
  setBookingTransport,
  listGuideAssignmentsByUser,
  listDriverAssignmentsByUser,
  confirmBooking,
};
