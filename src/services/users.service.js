const usersRepo = require('../repository/user.repository');
const userLanguagesRepo = require('../repository/user-languages.repository');
const rolesService = require('./roles.service');
const { AppError } = require('../utils/AppError');
const { isConductorRole, isGuiaRole } = require('../constants/roleIds');
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

function normalizeLanguageIds(languageIds) {
  if (languageIds === undefined || languageIds === null) {
    return [];
  }
  if (!Array.isArray(languageIds)) {
    throw new AppError('languageIds debe ser un arreglo de UUID', 400, 'INVALID_LANGUAGE_IDS');
  }
  const ids = [...new Set(languageIds.map((id) => String(id).trim()).filter(Boolean))];
  for (const id of ids) {
    if (!UUID_REGEX.test(id)) {
      throw new AppError(`languageId inválido: ${id}`, 400, 'INVALID_LANGUAGE_IDS');
    }
  }
  return ids;
}

async function assertLanguagesExist(languageIds) {
  if (!languageIds.length) return;
  const found = await userLanguagesRepo.countActiveLanguagesByIds(languageIds);
  if (found !== languageIds.length) {
    throw new AppError(
      'Uno o más languageIds no existen o están inactivos en ops.language',
      400,
      'INVALID_LANGUAGE_IDS'
    );
  }
}

async function resolveLanguageIdsForRole(roleId, languageIds, { required = false } = {}) {
  const requiresLanguages = await rolesService.roleRequiresLanguages(roleId);
  const normalized = normalizeLanguageIds(languageIds);

  if (!requiresLanguages) {
    if (normalized.length > 0) {
      throw new AppError(
        'languageIds solo aplica para usuarios con rol Guía',
        400,
        'GUIDE_LANGUAGES_NOT_ALLOWED'
      );
    }
    return [];
  }

  if (required && normalized.length === 0) {
    throw new AppError(
      isGuiaRole(roleId)
        ? 'languageIds es obligatorio para el rol Guía (al menos un idioma)'
        : 'languageIds es obligatorio para el rol seleccionado (al menos un idioma)',
      400,
      'GUIDE_LANGUAGES_REQUIRED'
    );
  }

  await assertLanguagesExist(normalized);
  return normalized;
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
      isConductorRole(roleId)
        ? 'licenseExpirationDate es obligatorio para el rol Conductor'
        : 'licenseExpirationDate es obligatorio para el rol seleccionado',
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
    languageIds,
  } = payload || {};

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

  const resolvedLanguageIds = await resolveLanguageIdsForRole(roleId, languageIds, {
    required: true,
  });

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
    languageIds: resolvedLanguageIds,
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
    status,
    languageIds,
  } = payload || {};

  if (cedula !== undefined) validateRequiredText(cedula, 'cedula');
  if (email !== undefined) validateEmail(email);
  if (fullName !== undefined) validateRequiredText(fullName, 'fullName');
  if (phone !== undefined) validateRequiredText(phone, 'phone');
  if (roleId !== undefined) validateRoleId(roleId);
  validateLicenseExpirationDateFormat(licenseExpirationDate);
  validateSpeaksEnglish(speaksEnglish);
  validateStatus(status);

  const current = await usersRepo.getUserById(userId);
  if (!current) return null;

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

  const effectiveRoleId = updateData.roleId ?? current.roleId;
  const effectiveLicense =
    updateData.licenseExpirationDate !== undefined
      ? updateData.licenseExpirationDate
      : current.licenseExpirationDate;

  await assertDriverLicenseDate(effectiveRoleId, effectiveLicense);

  const roleChanged = updateData.roleId !== undefined && updateData.roleId !== current.roleId;
  const willRequireLanguages = await rolesService.roleRequiresLanguages(effectiveRoleId);

  if (!willRequireLanguages) {
    updateData.clearLanguages = true;
  } else if (languageIds !== undefined) {
    updateData.languageIds = await resolveLanguageIdsForRole(effectiveRoleId, languageIds, {
      required: true,
    });
  } else if (roleChanged) {
    const existingCount = Array.isArray(current.languages) ? current.languages.length : 0;
    if (existingCount === 0) {
      throw new AppError(
        'languageIds es obligatorio al asignar el rol Guía',
        400,
        'GUIDE_LANGUAGES_REQUIRED'
      );
    }
  } else {
    const existingCount = Array.isArray(current.languages) ? current.languages.length : 0;
    if (existingCount === 0) {
      throw new AppError(
        'El usuario Guía debe tener al menos un idioma (envíe languageIds)',
        400,
        'GUIDE_LANGUAGES_REQUIRED'
      );
    }
  }

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
    requiresLanguages: r.requiresLanguages,
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
