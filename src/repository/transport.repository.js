const { pool } = require('../config/db.pg');

async function listTransports({ page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;
  
  // Obtener el total de registros
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM ops.transport`
  );
  const total = parseInt(countResult.rows[0].total, 10);
  
  // Obtener los registros paginados
  const { rows } = await pool.query(
    `SELECT id, capacity, model, operational_status as "operationalStatus", status
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

async function createTransport({ capacity, model, operationalStatus = true, status = true }) {
  const sql = `
    INSERT INTO ops.transport (capacity, model, operational_status, status)
    VALUES ($1, $2, $3, $4)
    RETURNING id, capacity, model, operational_status as "operationalStatus", status;
  `;
  const params = [capacity, model, operationalStatus, status];
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

async function getTransportById(transportId) {
  const { rows } = await pool.query(
    `
    SELECT id, capacity, model, operational_status as "operationalStatus", status
    FROM ops.transport
    WHERE id = $1
    `,
    [transportId]
  );

  return rows[0] || null;
}

async function updateTransport(transportId, { capacity, model, operationalStatus, status }) {
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

  if (updates.length === 0) {
    // Si no hay actualizaciones, devolvemos el transporte actual
    return getTransportById(transportId);
  }

  params.push(transportId);
  const sql = `
    UPDATE ops.transport
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, capacity, model, operational_status as "operationalStatus", status;
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
    RETURNING id, capacity, model, operational_status as "operationalStatus", status;
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
    `SELECT id, capacity, model, operational_status as "operationalStatus", status
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
  createTransport,
  getTransportById,
  updateTransport,
  deleteTransport,
  getAvailableTransports,
};

