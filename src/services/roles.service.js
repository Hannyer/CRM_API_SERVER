const rolesRepo = require('../repository/roles.repository');
const { AppError } = require('../utils/AppError');

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertValidName(name) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new AppError('name es requerido', 400, 'INVALID_ROLE_NAME');
  }
}

function assertValidRoleId(roleId) {
  if (!roleId || typeof roleId !== 'string' || !UUID_REGEX.test(roleId.trim())) {
    throw new AppError('roleId debe ser un UUID válido', 400, 'INVALID_ROLE_ID');
  }
}

async function listRoles(params) {
  return rolesRepo.listRoles(params);
}

async function getRoleById(id) {
  return rolesRepo.getRoleById(id);
}

async function listActiveRolesForSelect() {
  return rolesRepo.listActiveRolesForSelect();
}

async function assertActiveRoleId(roleId) {
  assertValidRoleId(roleId);
  const exists = await rolesRepo.existsActiveRoleById(roleId.trim());
  if (!exists) {
    throw new AppError(`roleId inválido o inactivo: ${roleId}`, 400, 'INVALID_USER_ROLE');
  }
}

async function roleRequiresLicense(roleId) {
  const role = await rolesRepo.getRoleById(roleId);
  return role?.requiresLicense === true;
}

async function createRole(payload) {
  const { name, description, requiresLicense, status } = payload;
  assertValidName(name);
  return rolesRepo.createRole({
    name,
    description: description ?? null,
    requiresLicense: !!requiresLicense,
    status: status !== false,
  });
}

async function updateRole(id, payload) {
  if (payload.name !== undefined) assertValidName(payload.name);

  const current = await rolesRepo.getRoleById(id);
  if (!current) return null;

  return rolesRepo.updateRole(id, payload);
}

async function deleteRole(id) {
  const current = await rolesRepo.getRoleById(id);
  if (!current) return null;

  const usersCount = await rolesRepo.countUsersByRoleId(id);
  if (usersCount > 0) {
    throw new AppError(
      `No se puede desactivar el rol: ${usersCount} usuario(s) lo tienen asignado`,
      409,
      'ROLE_IN_USE'
    );
  }

  return rolesRepo.deleteRole(id);
}

module.exports = {
  listRoles,
  getRoleById,
  listActiveRolesForSelect,
  assertActiveRoleId,
  roleRequiresLicense,
  createRole,
  updateRole,
  deleteRole,
};
