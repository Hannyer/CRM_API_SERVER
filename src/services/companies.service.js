const companiesRepo = require('../repository/companies.repository');
const { AppError } = require('../utils/AppError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeRequiredText(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(`${fieldName} es requerido`, 400);
  }

  return value.trim();
}

function normalizeEmail(email) {
  const normalizedEmail = normalizeRequiredText(email, 'email').toLowerCase();

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new AppError('email debe tener un formato válido', 400);
  }

  return normalizedEmail;
}

/**
 * Crea una nueva compañía
 */
async function createCompany(payload) {
  const {
    name,
    email,
    phone,
    commissionPercentage,
    status = true,
  } = payload;

  const normalizedName = normalizeRequiredText(name, 'name');
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizeRequiredText(phone, 'phone');

  // Validar que el porcentaje esté en el rango válido
  if (commissionPercentage < 0 || commissionPercentage > 100) {
    throw new AppError('El porcentaje de comisión debe estar entre 0 y 100', 400);
  }

  return companiesRepo.createCompany({
    name: normalizedName,
    email: normalizedEmail,
    phone: normalizedPhone,
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
async function updateCompany(companyId, { name, email, phone, commissionPercentage, status }) {
  const updateData = {};

  if (name !== undefined) updateData.name = normalizeRequiredText(name, 'name');
  if (email !== undefined) updateData.email = normalizeEmail(email);
  if (phone !== undefined) updateData.phone = normalizeRequiredText(phone, 'phone');

  // Validar que el porcentaje esté en el rango válido si se proporciona
  if (commissionPercentage !== undefined && (commissionPercentage < 0 || commissionPercentage > 100)) {
    throw new AppError('El porcentaje de comisión debe estar entre 0 y 100', 400);
  }

  if (commissionPercentage !== undefined) updateData.commissionPercentage = commissionPercentage;
  if (status !== undefined) updateData.status = status;

  return companiesRepo.updateCompany(companyId, updateData);
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

