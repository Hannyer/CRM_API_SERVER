const { pool } = require('../config/db.pg');

/**
 * Devuelve el token de calendario de un usuario (o null si no tiene).
 */
async function getCalendarToken(userId) {
  const { rows } = await pool.query(
    `SELECT calendar_token AS "calendarToken" FROM ops.app_user WHERE id = $1::uuid`,
    [userId]
  );
  return rows[0] ? rows[0].calendarToken : null;
}

/**
 * Asigna (o reemplaza) el token de calendario de un usuario.
 */
async function setCalendarToken(userId, token) {
  const { rows } = await pool.query(
    `UPDATE ops.app_user
        SET calendar_token = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1::uuid
      RETURNING calendar_token AS "calendarToken"`,
    [userId, token]
  );
  return rows[0] ? rows[0].calendarToken : null;
}

/**
 * Resuelve el usuario (guía) dueño de un token de calendario.
 */
async function getUserByCalendarToken(token) {
  const { rows } = await pool.query(
    `SELECT id, full_name AS "fullName", role_id AS "roleId"
       FROM ops.app_user
      WHERE calendar_token = $1
        AND status = true
      LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

/**
 * Lista las salidas asignadas a un guía dentro de una ventana de fechas,
 * con los datos que van al evento del calendario.
 */
async function listGuideAssignmentsForCalendar(userId, { fromDate, toDate } = {}) {
  const { rows } = await pool.query(
    `
    SELECT
      s.id AS "activityScheduleId",
      a.title AS "activityTitle",
      s.scheduled_start AS "scheduledStart",
      s.scheduled_end AS "scheduledEnd",
      COALESCE(b.booking_count, 0)::int AS "bookingCount",
      COALESCE(b.total_people, 0)::int AS "totalPeople",
      s.updated_at AS "updatedAt"
    FROM ops.activity_schedule_guide asg
    JOIN ops.activity_schedule s ON s.id = asg.activity_schedule_id
    JOIN ops.activity a ON a.id = s.activity_id
    LEFT JOIN (
      SELECT activity_schedule_id, COUNT(*) AS booking_count, SUM(number_of_people) AS total_people
      FROM ops.booking
      WHERE status IN ('pending', 'confirmed')
      GROUP BY activity_schedule_id
    ) b ON b.activity_schedule_id = s.id
    WHERE asg.guide_id = $1::uuid
      AND s.status = true
      AND s.scheduled_start >= $2::timestamptz
      AND s.scheduled_start < $3::timestamptz
    ORDER BY s.scheduled_start ASC
    `,
    [userId, fromDate, toDate]
  );
  return rows;
}

/**
 * Lista los traslados asignados a un conductor dentro de una ventana de fechas,
 * con los datos que van al evento del calendario (vehículo, recogida, cliente).
 */
async function listDriverAssignmentsForCalendar(userId, { fromDate, toDate } = {}) {
  const { rows } = await pool.query(
    `
    SELECT
      b.id AS "bookingId",
      b.customer_name AS "customerName",
      b.customer_phone AS "customerPhone",
      b.number_of_people AS "numberOfPeople",
      b.status,
      a.title AS "activityTitle",
      s.scheduled_start AS "scheduledStart",
      s.scheduled_end AS "scheduledEnd",
      t.model,
      t.license_plate AS "licensePlate",
      COALESCE(rp.description, b.reference_point_description) AS "referencePointDescription",
      bt.pickup_at AS "pickupAt",
      bt.created_at AS "updatedAt"
    FROM ops.booking_transport bt
    JOIN ops.booking b ON b.id = bt.booking_id
    JOIN ops.activity_schedule s ON s.id = b.activity_schedule_id
    JOIN ops.activity a ON a.id = s.activity_id
    JOIN ops.transport t ON t.id = bt.transport_id
    LEFT JOIN ops.reference_point rp ON rp.id = bt.reference_point_id
    WHERE bt.driver_id = $1::uuid
      AND b.status IN ('pending', 'confirmed')
      AND COALESCE(bt.pickup_at, s.scheduled_start) >= $2::timestamptz
      AND COALESCE(bt.pickup_at, s.scheduled_start) < $3::timestamptz
    ORDER BY COALESCE(bt.pickup_at, s.scheduled_start) ASC
    `,
    [userId, fromDate, toDate]
  );
  return rows;
}

module.exports = {
  getCalendarToken,
  setCalendarToken,
  getUserByCalendarToken,
  listGuideAssignmentsForCalendar,
  listDriverAssignmentsForCalendar,
};
