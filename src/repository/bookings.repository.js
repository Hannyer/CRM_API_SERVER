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
      a.adult_price as "adultPrice",
      a.child_price as "childPrice",
      a.senior_price as "seniorPrice",
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
 * Obtiene una configuración de bookings por ID
 */
async function getConfigurationsBookings(configurationId) {
  const { rows } = await pool.query(
    `
    SELECT
      id,
      key01,
      key02,
      key03,
      key04,
      key05,
      key06,
      value,
      description,
      observation,
      display_name as "displayName",
      status,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM ops."configuration"
    WHERE id = $1::uuid
    `,
    [configurationId]
  );

  return rows[0] || null;
}

/**
 * Crea una nueva reserva
 */
async function createBooking({
  activityScheduleId,
  companyId = null,
  transport = false,
  numberOfPeople,
  adultCount = 0,
  childCount = 0,
  seniorCount = 0,
  passengerCount = null,
  comment = null,
  paymentTypeId,
  cardTypeId = null,
  commissionPercentage,
  subtotal = null,
  vatAmount = null,
  total = null,
  exempt = false,
  commissionAmount = null,
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
      transport, 
      number_of_people,
      adult_count,
      child_count,
      senior_count,
      passenger_count,
      comment,
      payment_type_id,
      card_type_id,
      commission_percentage,
      subtotal,
      vat_amount,
      total,
      exempt,
      commission_amount,
      customer_name,
      customer_email,
      customer_phone,
      status,
      created_by
    )
    VALUES ($1::uuid, $2::uuid, $3::bool, $4::int, $5::int, $6::int, $7::int, $8::int, $9::text, $10::uuid, $11::uuid, $12::numeric, $13::numeric, $14::numeric, $15::numeric, $16::bool, $17::numeric, $18, $19, $20, $21, $22::uuid)
    RETURNING 
      id,
      activity_schedule_id as "activityScheduleId",
      company_id as "companyId",
      transport,
      number_of_people as "numberOfPeople",
      adult_count as "adultCount",
      child_count as "childCount",
      senior_count as "seniorCount",
      passenger_count as "passengerCount",
      comment,
      payment_type_id as "paymentTypeId",
      card_type_id as "cardTypeId",
      commission_percentage as "commissionPercentage",
      subtotal,
      vat_amount as "vatAmount",
      total,
      exempt,
      commission_amount as "commissionAmount",
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
    transport,
    numberOfPeople,
    adultCount,
    childCount,
    seniorCount,
    passengerCount,
    comment,
    paymentTypeId,
    cardTypeId,
    commissionPercentage,
    subtotal,
    vatAmount,
    total,
    exempt,
    commissionAmount,
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
      b.transport,
      b.number_of_people as "numberOfPeople",
      b.adult_count as "adultCount",
      b.child_count as "childCount",
      b.senior_count as "seniorCount",
      b.passenger_count as "passengerCount",
      b.comment,
      b.payment_type_id as "paymentTypeId",
      pt.name as "paymentTypeName",
      b.card_type_id as "cardTypeId",
      ct.name as "cardTypeName",
      b.commission_percentage as "commissionPercentage",
      b.subtotal,
      b.vat_amount as "vatAmount",
      b.total,
      b.exempt,
      b.commission_amount as "commissionAmount",
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
      c.name as "companyName"
    FROM ops.booking b
    JOIN ops.activity_schedule s ON s.id = b.activity_schedule_id
    JOIN ops.activity a ON a.id = s.activity_id
    LEFT JOIN ops.company c ON c.id = b.company_id
    LEFT JOIN ops.payment_type pt ON pt.id = b.payment_type_id
    LEFT JOIN ops.card_type ct ON ct.id = b.card_type_id
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
      b.transport,
      b.number_of_people as "numberOfPeople",
      b.adult_count as "adultCount",
      b.child_count as "childCount",
      b.senior_count as "seniorCount",
      b.passenger_count as "passengerCount",
      b.comment,
      b.payment_type_id as "paymentTypeId",
      pt.name as "paymentTypeName",
      b.card_type_id as "cardTypeId",
      ct.name as "cardTypeName",
      b.commission_percentage as "commissionPercentage",
      b.subtotal,
      b.vat_amount as "vatAmount",
      b.total,
      b.exempt,
      b.commission_amount as "commissionAmount",
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
      c.commission_percentage as "companyCommissionPercentage"
    FROM ops.booking b
    JOIN ops.activity_schedule s ON s.id = b.activity_schedule_id
    JOIN ops.activity a ON a.id = s.activity_id
    LEFT JOIN ops.company c ON c.id = b.company_id
    LEFT JOIN ops.payment_type pt ON pt.id = b.payment_type_id
    LEFT JOIN ops.card_type ct ON ct.id = b.card_type_id
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
  transport,
  numberOfPeople,
  adultCount,
  childCount,
  seniorCount,
  passengerCount,
  comment,
  paymentTypeId,
  cardTypeId,
  commissionPercentage,
  subtotal,
  vatAmount,
  total,
  exempt,
  commissionAmount,
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
  if (transport !== undefined) {
    updates.push(`transport = $${paramIndex++}::bool`);
    params.push(transport);
  }
  if (numberOfPeople !== undefined) {
    updates.push(`number_of_people = $${paramIndex++}::int`);
    params.push(numberOfPeople);
  }
  if (adultCount !== undefined) {
    updates.push(`adult_count = $${paramIndex++}::int`);
    params.push(adultCount);
  }
  if (childCount !== undefined) {
    updates.push(`child_count = $${paramIndex++}::int`);
    params.push(childCount);
  }
  if (seniorCount !== undefined) {
    updates.push(`senior_count = $${paramIndex++}::int`);
    params.push(seniorCount);
  }
  if (passengerCount !== undefined) {
    updates.push(`passenger_count = $${paramIndex++}::int`);
    params.push(passengerCount);
  }
  if (comment !== undefined) {
    updates.push(`comment = $${paramIndex++}::text`);
    params.push(comment);
  }
  if (paymentTypeId !== undefined) {
    updates.push(`payment_type_id = $${paramIndex++}::uuid`);
    params.push(paymentTypeId);
  }
  if (cardTypeId !== undefined) {
    updates.push(`card_type_id = $${paramIndex++}::uuid`);
    params.push(cardTypeId);
  }
  if (commissionPercentage !== undefined) {
    updates.push(`commission_percentage = $${paramIndex++}::numeric`);
    params.push(commissionPercentage);
  }
  if (subtotal !== undefined) {
    updates.push(`subtotal = $${paramIndex++}::numeric`);
    params.push(subtotal);
  }
  if (vatAmount !== undefined) {
    updates.push(`vat_amount = $${paramIndex++}::numeric`);
    params.push(vatAmount);
  }
  if (total !== undefined) {
    updates.push(`total = $${paramIndex++}::numeric`);
    params.push(total);
  }
  if (exempt !== undefined) {
    updates.push(`exempt = $${paramIndex++}::bool`);
    params.push(exempt);
  }
  if (commissionAmount !== undefined) {
    updates.push(`commission_amount = $${paramIndex++}::numeric`);
    params.push(commissionAmount);
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
      transport,
      number_of_people as "numberOfPeople",
      adult_count as "adultCount",
      child_count as "childCount",
      senior_count as "seniorCount",
      passenger_count as "passengerCount",
      comment,
      payment_type_id as "paymentTypeId",
      card_type_id as "cardTypeId",
      commission_percentage as "commissionPercentage",
      subtotal,
      vat_amount as "vatAmount",
      total,
      exempt,
      commission_amount as "commissionAmount",
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
  getConfigurationsBookings,
  createBooking,
  listBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
};

