const companiesRepo = require('../repository/companies.repository');

/**
 * Crea una nueva compañía
 */
async function createCompany(payload) {
  const {
    name,
    commissionPercentage,
    status = true,
  } = payload;

  // Validar que el porcentaje esté en el rango válido
  if (commissionPercentage < 0 || commissionPercentage > 100) {
    throw new Error('El porcentaje de comisión debe estar entre 0 y 100');
  }

  return companiesRepo.createCompany({
    name,
    commissionPercentage,
    status
  });
}

/**
 * Lista todas las compañías con paginación
 */
async function listCompanies({ page, limit, status } = {}) {
  return companiesRepo.listCompanies({ page, limit, status });
}

/**
 * Obtiene una compañía por ID
 */
async function getCompanyById(companyId) {
  return companiesRepo.getCompanyById(companyId);
}

/**
 * Actualiza una compañía existente
 */
async function updateCompany(companyId, { name, commissionPercentage, status }) {
  // Validar que el porcentaje esté en el rango válido si se proporciona
  if (commissionPercentage !== undefined && (commissionPercentage < 0 || commissionPercentage > 100)) {
    throw new Error('El porcentaje de comisión debe estar entre 0 y 100');
  }

  return companiesRepo.updateCompany(companyId, {
    name,
    commissionPercentage,
    status
  });
}

/**
 * Activa o inactiva una compañía
 */
async function toggleCompanyStatus(companyId, status) {
  return companiesRepo.toggleCompanyStatus(companyId, status);
}

/**
 * Elimina una compañía (soft delete)
 */
async function deleteCompany(companyId) {
  return companiesRepo.deleteCompany(companyId);
}

module.exports = {
  createCompany,
  listCompanies,
  getCompanyById,
  updateCompany,
  toggleCompanyStatus,
  deleteCompany,
};

