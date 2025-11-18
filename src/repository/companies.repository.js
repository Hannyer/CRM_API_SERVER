// src/repository/companies.repository.js
const { pool } = require('../config/db.pg');

/**
 * Crea una nueva compañía
 * Retorna el registro creado.
 */
async function createCompany({ name, commissionPercentage, status = true }) {
  const sql = `
    INSERT INTO ops.company (name, commission_percentage, status)
    VALUES ($1, $2::numeric, $3::bool)
    RETURNING id, name, commission_percentage as "commissionPercentage", status, created_at as "createdAt", updated_at as "updatedAt";
  `;
  const params = [name, commissionPercentage, status];
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

/**
 * Lista todas las compañías con paginación
 */
async function listCompanies({ page = 1, limit = 10, status = null } = {}) {
  const offset = (page - 1) * limit;
  
  let statusFilter = '';
  const params = [];
  let paramIndex = 1;

  if (status !== null) {
    statusFilter = `WHERE status = $${paramIndex++}::bool`;
    params.push(status);
  }

  // Obtener el total de registros
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM ops.company ${statusFilter}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);
  
  // Obtener los registros paginados
  const { rows } = await pool.query(
    `
    SELECT 
      id,
      name,
      commission_percentage as "commissionPercentage",
      status,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM ops.company
    ${statusFilter}
    ORDER BY name ASC
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
 * Obtiene una compañía por ID
 */
async function getCompanyById(companyId) {
  const { rows } = await pool.query(
    `
    SELECT 
      id,
      name,
      commission_percentage as "commissionPercentage",
      status,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM ops.company
    WHERE id = $1::uuid
    `,
    [companyId]
  );

  return rows[0] || null;
}

/**
 * Actualiza una compañía existente
 */
async function updateCompany(companyId, { name, commissionPercentage, status }) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(name);
  }
  if (commissionPercentage !== undefined) {
    updates.push(`commission_percentage = $${paramIndex++}::numeric`);
    params.push(commissionPercentage);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramIndex++}::bool`);
    params.push(status);
  }

  if (updates.length === 0) {
    return getCompanyById(companyId);
  }

  // Agregar updated_at
  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  params.push(companyId);
  const sql = `
    UPDATE ops.company
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}::uuid
    RETURNING id, name, commission_percentage as "commissionPercentage", status, created_at as "createdAt", updated_at as "updatedAt";
  `;

  const { rows } = await pool.query(sql, params);
  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

/**
 * Activa o inactiva una compañía
 */
async function toggleCompanyStatus(companyId, status) {
  const { rows } = await pool.query(
    `
    UPDATE ops.company
    SET status = $1::bool, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2::uuid
    RETURNING id, name, commission_percentage as "commissionPercentage", status, created_at as "createdAt", updated_at as "updatedAt";
    `,
    [status, companyId]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

/**
 * Elimina una compañía (soft delete cambiando status a false)
 */
async function deleteCompany(companyId) {
  // Soft delete: cambiamos el status a false
  const { rows } = await pool.query(
    `
    UPDATE ops.company
    SET status = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1::uuid
    RETURNING id, name, status;
    `,
    [companyId]
  );

  return rows[0] || null;
}

module.exports = {
  createCompany,
  listCompanies,
  getCompanyById,
  updateCompany,
  toggleCompanyStatus,
  deleteCompany,
};

