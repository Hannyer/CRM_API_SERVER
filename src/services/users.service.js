const usersRepo = require('../repository/user.repository');
const { AppError } = require('../utils/AppError');
const { encrypt } = require('../utils/crypto-compat');
const { USER_ROLE_VALUES, DRIVER_ROLE } = require('../constants/userRoles');

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

function assertValidRole(role) {
  if (!USER_ROLE_VALUES.includes(role)) {
    throw new AppError(
      `role inválido. Valores permitidos: ${USER_ROLE_VALUES.join(', ')}`,
      400,
      'INVALID_USER_ROLE'
    );
  }
}

function assertDriverLicenseDate(role, licenseExpirationDate) {
  if (role === DRIVER_ROLE && !licenseExpirationDate) {
    throw new AppError(
      'licenseExpirationDate es obligatorio cuando el rol es driver',
      400,
      'DRIVER_LICENSE_REQUIRED'
    );
  }
}

async function listUsers({ page, limit, status, role } = {}) {
  return usersRepo.listUsers({ page, limit, status, role });
}

async function createUser(payload) {
  const {
    cedula,
    email,
    fullName,
    phone,
    password,
    role,
    licenseExpirationDate,
    speaksEnglish,
    status,
  } = payload;

  assertValidRole(role);
  assertDriverLicenseDate(role, licenseExpirationDate);

  const normalizedCedula = await assertUniqueCedula(cedula);
  const normalizedEmail = await assertUniqueEmail(email);

  return usersRepo.createUser({
    cedula: normalizedCedula,
    email: normalizedEmail,
    fullName: fullName.trim(),
    phone: phone.trim(),
    passwordHash: encrypt(password),
    role,
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
  if (payload.role !== undefined) {
    assertValidRole(payload.role);
    updateData.role = payload.role;
  }
  if (payload.licenseExpirationDate !== undefined) {
    updateData.licenseExpirationDate = payload.licenseExpirationDate || null;
  }
  if (payload.speaksEnglish !== undefined) updateData.speaksEnglish = !!payload.speaksEnglish;
  if (payload.status !== undefined) updateData.status = !!payload.status;

  const current = await usersRepo.getUserById(userId);
  if (!current) return null;

  const effectiveRole = updateData.role ?? current.role;
  const effectiveLicense =
    updateData.licenseExpirationDate !== undefined
      ? updateData.licenseExpirationDate
      : current.licenseExpirationDate;

  assertDriverLicenseDate(effectiveRole, effectiveLicense);

  return usersRepo.updateUser(userId, updateData);
}

async function deleteUser(userId) {
  return usersRepo.deleteUser(userId);
}

function getAvailableRoles() {
  return USER_ROLE_VALUES;
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
