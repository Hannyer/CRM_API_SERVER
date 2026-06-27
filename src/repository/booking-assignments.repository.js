// src/repository/booking-assignments.repository.js
const { pool } = require('../config/db.pg');

// UUID del rol "Guía" en ops.role
const GUIDE_ROLE_ID = '9d3372fa-7180-4f04-9727-374e9b513d53';

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
      bt.created_at as "assignedAt"
    FROM ops.booking_transport bt
    JOIN ops.transport t ON t.id = bt.transport_id
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
 * Lista los usuarios con rol Guía activos disponibles para asignar
 */
async function getAvailableGuides(bookingId = null) {
  const { rows } = await pool.query(
    `
    WITH target_schedule AS (
      SELECT s.id, s.scheduled_start, s.scheduled_end
      FROM ops.booking b
      JOIN ops.activity_schedule s ON s.id = b.activity_schedule_id
      WHERE b.id = $2::uuid
    )
    SELECT
      u.id,
      u.full_name as "fullName",
      u.email,
      u.phone,
      u.status,
      u.speaks_english as "speaksEnglish",
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
      AND (
        $2::uuid IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM ops.activity_schedule_guide asg
          JOIN ops.activity_schedule s ON s.id = asg.activity_schedule_id
          CROSS JOIN target_schedule ts
          WHERE asg.guide_id = u.id
            AND s.id <> ts.id
            AND s.status = true
            AND s.scheduled_start < ts.scheduled_end
            AND s.scheduled_end > ts.scheduled_start
        )
      )
    ORDER BY u.full_name ASC
    `,
    [GUIDE_ROLE_ID, bookingId]
  );
  return rows;
}

async function getAvailableGuidesByScheduleId(activityScheduleId) {
  const { rows } = await pool.query(
    `
    WITH target_schedule AS (
      SELECT id, scheduled_start, scheduled_end
      FROM ops.activity_schedule
      WHERE id = $2::uuid
    )
    SELECT
      u.id,
      u.full_name as "fullName",
      u.email,
      u.phone,
      u.status,
      u.speaks_english as "speaksEnglish",
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
      AND NOT EXISTS (
        SELECT 1
        FROM ops.activity_schedule_guide asg
        JOIN ops.activity_schedule s ON s.id = asg.activity_schedule_id
        CROSS JOIN target_schedule ts
        WHERE asg.guide_id = u.id
          AND s.id <> ts.id
          AND s.status = true
          AND s.scheduled_start < ts.scheduled_end
          AND s.scheduled_end > ts.scheduled_start
      )
    ORDER BY u.full_name ASC
    `,
    [GUIDE_ROLE_ID, activityScheduleId]
  );
  return rows;
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
      bt.created_at as "assignedAt"
    FROM ops.booking b
    JOIN ops.activity_schedule s ON s.id = b.activity_schedule_id
    JOIN ops.activity a ON a.id = s.activity_id
    JOIN ops.booking_transport bt ON bt.booking_id = b.id
    JOIN ops.transport t ON t.id = bt.transport_id
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
async function setBookingTransport(bookingId, transportId) {
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
        INSERT INTO ops.booking_transport (booking_id, transport_id)
        VALUES ($1::uuid, $2::uuid)
        ON CONFLICT DO NOTHING
        `,
        [bookingId, transportId]
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
  getAvailableGuidesByScheduleId,
  listScheduleGuideAssignments,
  listBookingTransportAssignments,
  setBookingGuides,
  setScheduleGuides,
  setBookingTransport,
  confirmBooking,
};
