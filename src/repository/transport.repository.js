const { pool } = require('../config/db.pg');

const TRANSPORT_SELECT_FIELDS = `
  id, capacity, model,
  operational_status as "operationalStatus",
  status,
  license_plate as "licensePlate",
  circulation_permit_expiration_date as "circulationPermitExpirationDate",
  ctp_expiration_date as "ctpExpirationDate"
`;

async function listTransports({ page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;
  
  // Obtener el total de registros
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM ops.transport`
  );
  const total = parseInt(countResult.rows[0].total, 10);
  
  // Obtener los registros paginados
  const { rows } = await pool.query(
    `SELECT ${TRANSPORT_SELECT_FIELDS}
     FROM ops.transport
     ORDER BY model
     LIMIT $1 OFFSET $2`,
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

async function existsTransportByLicensePlate(licensePlate, excludeTransportId = null) {
  const { rows } = await pool.query(
    `
    SELECT 1
    FROM ops.transport
    WHERE UPPER(TRIM(license_plate)) = UPPER(TRIM($1))
      AND ($2::uuid IS NULL OR id <> $2)
    LIMIT 1
    `,
    [licensePlate, excludeTransportId]
  );
  return rows.length > 0;
}

async function createTransport({ capacity, model, operationalStatus = true, status = true, licensePlate, circulationPermitExpirationDate, ctpExpirationDate }) {
  const sql = `
    INSERT INTO ops.transport (capacity, model, operational_status, status, license_plate, circulation_permit_expiration_date, ctp_expiration_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING ${TRANSPORT_SELECT_FIELDS};
  `;
  const params = [capacity, model, operationalStatus, status, licensePlate, circulationPermitExpirationDate, ctpExpirationDate];
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

async function getTransportById(transportId) {
  const { rows } = await pool.query(
    `
    SELECT ${TRANSPORT_SELECT_FIELDS}
    FROM ops.transport
    WHERE id = $1
    `,
    [transportId]
  );

  return rows[0] || null;
}

async function updateTransport(transportId, {
  capacity,
  model,
  operationalStatus,
  status,
  licensePlate,
  circulationPermitExpirationDate,
  ctpExpirationDate,
}) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (capacity !== undefined) {
    updates.push(`capacity = $${paramIndex++}`);
    params.push(capacity);
  }
  if (model !== undefined) {
    updates.push(`model = $${paramIndex++}`);
    params.push(model);
  }
  if (operationalStatus !== undefined) {
    updates.push(`operational_status = $${paramIndex++}`);
    params.push(operationalStatus);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(status);
  }
  if (licensePlate !== undefined) {
    updates.push(`license_plate = $${paramIndex++}`);
    params.push(licensePlate);
  }
  if (circulationPermitExpirationDate !== undefined) {
    updates.push(`circulation_permit_expiration_date = $${paramIndex++}`);
    params.push(circulationPermitExpirationDate);
  }
  if (ctpExpirationDate !== undefined) {
    updates.push(`ctp_expiration_date = $${paramIndex++}`);
    params.push(ctpExpirationDate);
  }

  if (updates.length === 0) {
    // Si no hay actualizaciones, devolvemos el transporte actual
    return getTransportById(transportId);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(transportId);
  const sql = `
    UPDATE ops.transport
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING ${TRANSPORT_SELECT_FIELDS};
  `;

  const { rows } = await pool.query(sql, params);
  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

async function deleteTransport(transportId) {
  // Soft delete: cambiamos el status a false
  const { rows } = await pool.query(
    `
    UPDATE ops.transport
    SET status = false
    WHERE id = $1
    RETURNING ${TRANSPORT_SELECT_FIELDS};
    `,
    [transportId]
  );

  return rows[0] || null;
}

async function getAvailableTransports({ page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;
  
  // Obtener el total de registros disponibles (operational_status = true y status = true)
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM ops.transport WHERE operational_status = true AND status = true`
  );
  const total = parseInt(countResult.rows[0].total, 10);
  
  // Obtener los registros paginados disponibles
  const { rows } = await pool.query(
    `SELECT ${TRANSPORT_SELECT_FIELDS}
     FROM ops.transport
     WHERE operational_status = true AND status = true
     ORDER BY model
     LIMIT $1 OFFSET $2`,
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

module.exports = {
  listTransports,
  existsTransportByLicensePlate,
  createTransport,
  getTransportById,
  updateTransport,
  deleteTransport,
  getAvailableTransports,
};

