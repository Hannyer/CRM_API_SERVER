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
      bg.id as "assignmentId",
      u.id,
      u.full_name as "fullName",
      u.email,
      u.phone,
      u.status,
      bg.created_at as "assignedAt"
    FROM ops.booking_guide bg
    JOIN ops.app_user u ON u.id = bg.guide_id
    WHERE bg.booking_id = $1::uuid
    ORDER BY bg.created_at ASC
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
async function getAvailableGuides() {
  const { rows } = await pool.query(
    `
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
    ORDER BY u.full_name ASC
    `,
    [GUIDE_ROLE_ID]
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

    // Limpiar asignaciones anteriores
    await client.query(
      `DELETE FROM ops.booking_guide WHERE booking_id = $1::uuid`,
      [bookingId]
    );

    // Insertar nuevas asignaciones
    if (guideIds.length > 0) {
      await client.query(
        `
        INSERT INTO ops.booking_guide (booking_id, guide_id)
        SELECT $1::uuid, UNNEST($2::uuid[])
        ON CONFLICT DO NOTHING
        `,
        [bookingId, guideIds]
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
  setBookingGuides,
  setBookingTransport,
  confirmBooking,
};
