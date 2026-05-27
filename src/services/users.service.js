const usersRepo = require('../repository/user.repository');
const rolesService = require('./roles.service');
const { AppError } = require('../utils/AppError');
const { encrypt } = require('../utils/crypto-compat');

function normalizeCedula(cedula) {
  return cedula.trim();
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
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
  return usersRepo.listUsers({ page, limit, status, roleId });
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
  } = payload;

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
  return usersRepo.getUserById(userId);
}

async function updateUser(userId, payload) {
  const updateData = {};

  if (payload.cedula !== undefined) {
    updateData.cedula = await assertUniqueCedula(payload.cedula, userId);
  }
  if (payload.email !== undefined) {
    updateData.email = await assertUniqueEmail(payload.email, userId);
  }
  if (payload.fullName !== undefined) updateData.fullName = payload.fullName.trim();
  if (payload.phone !== undefined) updateData.phone = payload.phone.trim();
  if (payload.password !== undefined && payload.password !== '') {
    updateData.passwordHash = encrypt(payload.password);
  }
  if (payload.roleId !== undefined) {
    await assertValidRoleId(payload.roleId);
    updateData.roleId = payload.roleId.trim();
  }
  if (payload.licenseExpirationDate !== undefined) {
    updateData.licenseExpirationDate = payload.licenseExpirationDate || null;
  }
  if (payload.speaksEnglish !== undefined) updateData.speaksEnglish = !!payload.speaksEnglish;
  if (payload.status !== undefined) updateData.status = !!payload.status;

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
