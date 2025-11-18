// src/repository/bookings.repository.js
const { pool } = require('../config/db.pg');

/**
 * Obtiene las fechas disponibles (planeaciones) para una actividad específica
 * Solo retorna planeaciones activas y futuras
 */
async function getAvailableSchedulesByActivityId(activityId) {
  const { rows } = await pool.query(
    `
    SELECT 
      s.id,
      s.activity_id as "activityId",
      s.scheduled_start as "scheduledStart",
      s.scheduled_end as "scheduledEnd",
      s.status,
      a.title as "activityTitle",
      a.party_size as "partySize",
      COALESCE(
        (
          SELECT SUM(b.number_of_people)
          FROM ops.booking b
          WHERE b.activity_schedule_id = s.id
            AND b.status IN ('pending', 'confirmed')
        ),
        0
      ) as "bookedPeople"
    FROM ops.activity_schedule s
    JOIN ops.activity a ON a.id = s.activity_id
    WHERE s.activity_id = $1::uuid
      AND s.status = true
      AND a.status = true
      AND s.scheduled_start > CURRENT_TIMESTAMP
    ORDER BY s.scheduled_start ASC
    `,
    [activityId]
  );
  return rows;
}

/**
 * Valida la disponibilidad de espacios para una planeación específica
 * Retorna información sobre espacios disponibles
 */
async function checkAvailability(scheduleId) {
  const { rows } = await pool.query(
    `
    SELECT 
      s.id as "scheduleId",
      a.id as "activityId",
      a.title as "activityTitle",
      a.party_size as "partySize",
      COALESCE(
        (
          SELECT SUM(b.number_of_people)
          FROM ops.booking b
          WHERE b.activity_schedule_id = s.id
            AND b.status IN ('pending', 'confirmed')
        ),
        0
      ) as "bookedPeople",
      (a.party_size - COALESCE(
        (
          SELECT SUM(b.number_of_people)
          FROM ops.booking b
          WHERE b.activity_schedule_id = s.id
            AND b.status IN ('pending', 'confirmed')
        ),
        0
      )) as "availableSpaces"
    FROM ops.activity_schedule s
    JOIN ops.activity a ON a.id = s.activity_id
    WHERE s.id = $1::uuid
      AND s.status = true
      AND a.status = true
    `,
    [scheduleId]
  );
  return rows[0] || null;
}

/**
 * Crea una nueva reserva
 */
async function createBooking({
  activityScheduleId,
  companyId = null,
  transportId = null,
  numberOfPeople,
  commissionPercentage,
  customerName,
  customerEmail = null,
  customerPhone = null,
  status = 'pending',
  createdBy = null
}) {
  const sql = `
    INSERT INTO ops.booking (
      activity_schedule_id, 
      company_id, 
      transport_id, 
      number_of_people, 
      commission_percentage,
      customer_name,
      customer_email,
      customer_phone,
      status,
      created_by
    )
    VALUES ($1::uuid, $2::uuid, $3::uuid, $4::int, $5::numeric, $6, $7, $8, $9, $10::uuid)
    RETURNING 
      id,
      activity_schedule_id as "activityScheduleId",
      company_id as "companyId",
      transport_id as "transportId",
      number_of_people as "numberOfPeople",
      commission_percentage as "commissionPercentage",
      customer_name as "customerName",
      customer_email as "customerEmail",
      customer_phone as "customerPhone",
      status,
      created_at as "createdAt",
      updated_at as "updatedAt",
      created_by as "createdBy";
  `;
  const params = [
    activityScheduleId,
    companyId,
    transportId,
    numberOfPeople,
    commissionPercentage,
    customerName,
    customerEmail,
    customerPhone,
    status,
    createdBy
  ];
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

/**
 * Lista todas las reservas con paginación
 */
async function listBookings({ page = 1, limit = 10, status = null, activityScheduleId = null } = {}) {
  const offset = (page - 1) * limit;
  
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (status) {
    conditions.push(`b.status = $${paramIndex++}`);
    params.push(status);
  }
  if (activityScheduleId) {
    conditions.push(`b.activity_schedule_id = $${paramIndex++}::uuid`);
    params.push(activityScheduleId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Obtener el total de registros
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM ops.booking b ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);
  
  // Obtener los registros paginados
  const { rows } = await pool.query(
    `
    SELECT 
      b.id,
      b.activity_schedule_id as "activityScheduleId",
      b.company_id as "companyId",
      b.transport_id as "transportId",
      b.number_of_people as "numberOfPeople",
      b.commission_percentage as "commissionPercentage",
      b.customer_name as "customerName",
      b.customer_email as "customerEmail",
      b.customer_phone as "customerPhone",
      b.status,
      b.created_at as "createdAt",
      b.updated_at as "updatedAt",
      b.created_by as "createdBy",
      a.title as "activityTitle",
      s.scheduled_start as "scheduledStart",
      s.scheduled_end as "scheduledEnd",
      c.name as "companyName",
      t.model as "transportModel"
    FROM ops.booking b
    JOIN ops.activity_schedule s ON s.id = b.activity_schedule_id
    JOIN ops.activity a ON a.id = s.activity_id
    LEFT JOIN ops.company c ON c.id = b.company_id
    LEFT JOIN ops.transport t ON t.id = b.transport_id
    ${whereClause}
    ORDER BY b.created_at DESC
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
 * Obtiene una reserva por ID con información completa
 */
async function getBookingById(bookingId) {
  const { rows } = await pool.query(
    `
    SELECT 
      b.id,
      b.activity_schedule_id as "activityScheduleId",
      b.company_id as "companyId",
      b.transport_id as "transportId",
      b.number_of_people as "numberOfPeople",
      b.commission_percentage as "commissionPercentage",
      b.customer_name as "customerName",
      b.customer_email as "customerEmail",
      b.customer_phone as "customerPhone",
      b.status,
      b.created_at as "createdAt",
      b.updated_at as "updatedAt",
      b.created_by as "createdBy",
      a.id as "activityId",
      a.title as "activityTitle",
      a.party_size as "activityPartySize",
      s.scheduled_start as "scheduledStart",
      s.scheduled_end as "scheduledEnd",
      c.name as "companyName",
      c.commission_percentage as "companyCommissionPercentage",
      t.model as "transportModel",
      t.capacity as "transportCapacity"
    FROM ops.booking b
    JOIN ops.activity_schedule s ON s.id = b.activity_schedule_id
    JOIN ops.activity a ON a.id = s.activity_id
    LEFT JOIN ops.company c ON c.id = b.company_id
    LEFT JOIN ops.transport t ON t.id = b.transport_id
    WHERE b.id = $1::uuid
    `,
    [bookingId]
  );

  return rows[0] || null;
}

/**
 * Actualiza una reserva existente
 */
async function updateBooking(bookingId, {
  activityScheduleId,
  companyId,
  transportId,
  numberOfPeople,
  commissionPercentage,
  customerName,
  customerEmail,
  customerPhone,
  status
}) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (activityScheduleId !== undefined) {
    updates.push(`activity_schedule_id = $${paramIndex++}::uuid`);
    params.push(activityScheduleId);
  }
  if (companyId !== undefined) {
    updates.push(`company_id = $${paramIndex++}::uuid`);
    params.push(companyId);
  }
  if (transportId !== undefined) {
    updates.push(`transport_id = $${paramIndex++}::uuid`);
    params.push(transportId);
  }
  if (numberOfPeople !== undefined) {
    updates.push(`number_of_people = $${paramIndex++}::int`);
    params.push(numberOfPeople);
  }
  if (commissionPercentage !== undefined) {
    updates.push(`commission_percentage = $${paramIndex++}::numeric`);
    params.push(commissionPercentage);
  }
  if (customerName !== undefined) {
    updates.push(`customer_name = $${paramIndex++}`);
    params.push(customerName);
  }
  if (customerEmail !== undefined) {
    updates.push(`customer_email = $${paramIndex++}`);
    params.push(customerEmail);
  }
  if (customerPhone !== undefined) {
    updates.push(`customer_phone = $${paramIndex++}`);
    params.push(customerPhone);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(status);
  }

  if (updates.length === 0) {
    return getBookingById(bookingId);
  }

  // Agregar updated_at
  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  params.push(bookingId);
  const sql = `
    UPDATE ops.booking
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}::uuid
    RETURNING 
      id,
      activity_schedule_id as "activityScheduleId",
      company_id as "companyId",
      transport_id as "transportId",
      number_of_people as "numberOfPeople",
      commission_percentage as "commissionPercentage",
      customer_name as "customerName",
      customer_email as "customerEmail",
      customer_phone as "customerPhone",
      status,
      created_at as "createdAt",
      updated_at as "updatedAt",
      created_by as "createdBy";
  `;

  const { rows } = await pool.query(sql, params);
  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

/**
 * Cancela una reserva (cambia el status a 'cancelled')
 */
async function cancelBooking(bookingId) {
  const { rows } = await pool.query(
    `
    UPDATE ops.booking
    SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
    WHERE id = $1::uuid
    RETURNING 
      id,
      activity_schedule_id as "activityScheduleId",
      status,
      updated_at as "updatedAt";
    `,
    [bookingId]
  );

  return rows[0] || null;
}

module.exports = {
  getAvailableSchedulesByActivityId,
  checkAvailability,
  createBooking,
  listBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
};

