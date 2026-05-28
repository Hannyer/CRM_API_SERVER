const usersRepo = require('../repository/user.repository');
const rolesService = require('./roles.service');
const { AppError } = require('../utils/AppError');
const { encrypt } = require('../utils/crypto-compat');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeCedula(cedula) {
  return cedula.trim();
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function validateRequiredText(value, fieldName) {
  if (value === undefined || value === null || typeof value !== 'string' || !value.trim()) {
    throw new AppError(`${fieldName} es requerido`, 400);
  }
}

function validateEmail(email) {
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    throw new AppError('email es requerido y debe tener un formato válido', 400);
  }
}

function validateRoleId(roleId) {
  if (!roleId) throw new AppError('roleId es requerido', 400);
  if (typeof roleId !== 'string' || !UUID_REGEX.test(roleId.trim())) {
    throw new AppError('roleId debe ser un UUID válido', 400);
  }
}

function validateUserId(userId) {
  if (!userId) throw new AppError('El ID de usuario es requerido', 400);
  if (typeof userId !== 'string' || !UUID_REGEX.test(userId.trim())) {
    throw new AppError('El ID de usuario debe ser un UUID válido', 400);
  }
}

function validateLicenseExpirationDateFormat(licenseExpirationDate) {
  if (
    licenseExpirationDate !== undefined &&
    licenseExpirationDate !== null &&
    licenseExpirationDate !== ''
  ) {
    if (typeof licenseExpirationDate !== 'string' || !DATE_REGEX.test(licenseExpirationDate)) {
      throw new AppError('licenseExpirationDate debe tener formato YYYY-MM-DD', 400);
    }
  }
}

function validateSpeaksEnglish(value) {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new AppError('speaksEnglish debe ser un valor booleano', 400);
  }
}

function validateStatus(value) {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new AppError('status debe ser un valor booleano', 400);
  }
}

async function assertUniqueCedula(cedula, excludeUserId = null) {
  const normalized = normalizeCedula(cedula);
  if (await usersRepo.existsUserByCedula(normalized, excludeUserId)) {
    throw new AppError('Ya existe un usuario registrado con esa cédula', 409, 'DUPLICATE_USER_CEDULA');
  }
  return normalized;
}

async function assertUniqueEmail(email, excludeUserId = null) {
  const normalized = normalizeEmail(email);
  if (await usersRepo.existsUserByEmail(normalized, excludeUserId)) {
    throw new AppError('Ya existe un usuario registrado con ese correo', 409, 'DUPLICATE_USER_EMAIL');
  }
  return normalized;
}

async function assertValidRoleId(roleId) {
  await rolesService.assertActiveRoleId(roleId);
}

async function assertDriverLicenseDate(roleId, licenseExpirationDate) {
  const requiresLicense = await rolesService.roleRequiresLicense(roleId);
  if (requiresLicense && !licenseExpirationDate) {
    throw new AppError(
      'licenseExpirationDate es obligatorio para el rol seleccionado',
      400,
      'DRIVER_LICENSE_REQUIRED'
    );
  }
}

async function listUsers({ page, limit, status, roleId } = {}) {
  const parsedPage = page !== undefined ? parseInt(page, 10) : 1;
  const parsedLimit = limit !== undefined ? parseInt(limit, 10) : 10;

  if (isNaN(parsedPage) || parsedPage < 1) {
    throw new AppError('page debe ser mayor o igual a 1', 400);
  }
  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    throw new AppError('limit no puede ser menor a 1 o mayor a 100', 400);
  }
  if (roleId && !UUID_REGEX.test(roleId)) {
    throw new AppError('roleId de filtro inválido', 400);
  }
  if (status !== undefined && status !== null && typeof status !== 'boolean') {
    throw new AppError('status debe ser un valor booleano', 400);
  }

  return usersRepo.listUsers({ page: parsedPage, limit: parsedLimit, status, roleId });
}

async function createUser(payload) {
  const {
    cedula,
    email,
    fullName,
    phone,
    password,
    roleId,
    licenseExpirationDate,
    speaksEnglish,
    status,
  } = payload || {};

  // Validaciones
  validateRequiredText(cedula, 'cedula');
  validateEmail(email);
  validateRequiredText(fullName, 'fullName');
  validateRequiredText(phone, 'phone');
  validateRequiredText(password, 'password');
  validateRoleId(roleId);
  validateLicenseExpirationDateFormat(licenseExpirationDate);
  validateSpeaksEnglish(speaksEnglish);
  validateStatus(status);

  await assertValidRoleId(roleId);
  await assertDriverLicenseDate(roleId, licenseExpirationDate);

  const normalizedCedula = await assertUniqueCedula(cedula);
  const normalizedEmail = await assertUniqueEmail(email);

  return usersRepo.createUser({
    cedula: normalizedCedula,
    email: normalizedEmail,
    fullName: fullName.trim(),
    phone: phone.trim(),
    passwordHash: encrypt(password),
    roleId: roleId.trim(),
    licenseExpirationDate: licenseExpirationDate || null,
    speaksEnglish: !!speaksEnglish,
    status: status !== false,
  });
}

async function findByEmail(email) {
  if (!email) return null;
  return usersRepo.getUserByEmail(email);
}

async function getUserById(userId) {
  validateUserId(userId);
  return usersRepo.getUserById(userId);
}

async function updateUser(userId, payload) {
  validateUserId(userId);
  
  const {
    cedula,
    email,
    fullName,
    phone,
    password,
    roleId,
    licenseExpirationDate,
    speaksEnglish,
    status
  } = payload || {};

  // Validaciones
  if (cedula !== undefined) validateRequiredText(cedula, 'cedula');
  if (email !== undefined) validateEmail(email);
  if (fullName !== undefined) validateRequiredText(fullName, 'fullName');
  if (phone !== undefined) validateRequiredText(phone, 'phone');
  if (roleId !== undefined) validateRoleId(roleId);
  validateLicenseExpirationDateFormat(licenseExpirationDate);
  validateSpeaksEnglish(speaksEnglish);
  validateStatus(status);

  const updateData = {};

  if (cedula !== undefined) {
    updateData.cedula = await assertUniqueCedula(cedula, userId);
  }
  if (email !== undefined) {
    updateData.email = await assertUniqueEmail(email, userId);
  }
  if (fullName !== undefined) updateData.fullName = fullName.trim();
  if (phone !== undefined) updateData.phone = phone.trim();
  if (password !== undefined && password !== '') {
    updateData.passwordHash = encrypt(password);
  }
  if (roleId !== undefined) {
    await assertValidRoleId(roleId);
    updateData.roleId = roleId.trim();
  }
  if (licenseExpirationDate !== undefined) {
    updateData.licenseExpirationDate = licenseExpirationDate || null;
  }
  if (speaksEnglish !== undefined) updateData.speaksEnglish = !!speaksEnglish;
  if (status !== undefined) updateData.status = !!status;

  const current = await usersRepo.getUserById(userId);
  if (!current) return null;

  const effectiveRoleId = updateData.roleId ?? current.roleId;
  const effectiveLicense =
    updateData.licenseExpirationDate !== undefined
      ? updateData.licenseExpirationDate
      : current.licenseExpirationDate;

  await assertDriverLicenseDate(effectiveRoleId, effectiveLicense);

  return usersRepo.updateUser(userId, updateData);
}

async function deleteUser(userId) {
  validateUserId(userId);
  return usersRepo.deleteUser(userId);
}

async function getAvailableRoles() {
  const roles = await rolesService.listActiveRolesForSelect();
  return roles.map((r) => ({
    value: r.id,
    label: r.name,
    description: r.description,
    requiresLicense: r.requiresLicense,
  }));
}

module.exports = {
  listUsers,
  createUser,
  findByEmail,
  getUserById,
  updateUser,
  deleteUser,
  getAvailableRoles,
};
