const menuRepo = require('../repository/menu.repository');
const securityRepo = require('../repository/security.repository');
const rolesService = require('./roles.service');
const { AppError } = require('../utils/AppError');

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(value, fieldName) {
  if (!value || typeof value !== 'string' || !UUID_REGEX.test(value.trim())) {
    throw new AppError(`${fieldName} debe ser un UUID válido`, 400);
  }
}

async function listMenus(params) {
  return menuRepo.listMenus(params);
}

async function getMenuById(id) {
  assertUuid(id, 'id');
  return menuRepo.getMenuById(id);
}

async function createMenu(payload) {
  const { code, name } = payload || {};
  if (!code?.trim()) throw new AppError('code es requerido', 400);
  if (!name?.trim()) throw new AppError('name es requerido', 400);
  return menuRepo.createMenu(payload);
}

async function updateMenu(id, payload) {
  assertUuid(id, 'id');
  return menuRepo.updateMenu(id, payload);
}

async function deleteMenu(id) {
  assertUuid(id, 'id');
  return menuRepo.deleteMenu(id);
}

async function getPermissionsByRoleId(roleId) {
  assertUuid(roleId, 'roleId');
  await rolesService.assertActiveRoleId(roleId);

  const role = await rolesService.getRoleById(roleId);
  const items = await securityRepo.getPermissionsMatrixByRoleId(roleId);

  return {
    roleId,
    roleName: role?.name ?? null,
    items,
  };
}

async function savePermissionsForRole(roleId, permissions) {
  assertUuid(roleId, 'roleId');
  await rolesService.assertActiveRoleId(roleId);

  if (!Array.isArray(permissions)) {
    throw new AppError('permissions debe ser un arreglo', 400);
  }

  for (const p of permissions) {
    if (!p?.menuId || !UUID_REGEX.test(String(p.menuId).trim())) {
      throw new AppError('Cada permiso debe incluir menuId (UUID válido)', 400);
    }
  }

  const normalized = permissions.map((p) => ({
    menuId: p.menuId,
    canRead: !!(p.canRead || p.canWrite || p.canDelete),
    canWrite: !!p.canWrite,
    canDelete: !!p.canDelete,
    status: p.status !== false,
  }));

  const items = await securityRepo.upsertRolePermissions(roleId, normalized);
  const role = await rolesService.getRoleById(roleId);

  return {
    roleId,
    roleName: role?.name ?? null,
    items,
  };
}

async function getDynamicMenuForRole(roleId) {
  assertUuid(roleId, 'roleId');
  const items = await securityRepo.getMenuForRole(roleId);

  const sections = {};
  const unsectioned = [];

  for (const item of items) {
    if (item.section) {
      if (!sections[item.section]) sections[item.section] = [];
      sections[item.section].push(item);
    } else {
      unsectioned.push(item);
    }
  }

  return {
    roleId,
    items,
    sections,
    unsectioned,
  };
}

module.exports = {
  listMenus,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
  getPermissionsByRoleId,
  savePermissionsForRole,
  getDynamicMenuForRole,
};
