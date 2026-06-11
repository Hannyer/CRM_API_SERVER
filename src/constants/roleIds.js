/** IDs de roles en ops.role (validación de reglas de negocio por UUID). */
const ROLE_IDS = {
  CONDUCTOR: 'b07fe1a3-40e2-4cb8-9fd7-ff6df2a2dba3',
  RECEPCIONISTA: '809e4473-9952-45a0-984c-687febcd00c1',
  OPERADOR: '0e278751-4d4b-489a-af97-298d413d7985',
  GUIA: '9d3372fa-7180-4f04-9727-374e9b513d53',
  ADMINISTRADOR: '18af500d-6187-4632-b206-b176e83d776e',
};

function normalizeRoleId(roleId) {
  return typeof roleId === 'string' ? roleId.trim().toLowerCase() : '';
}

function isConductorRole(roleId) {
  return normalizeRoleId(roleId) === ROLE_IDS.CONDUCTOR.toLowerCase();
}

function isGuiaRole(roleId) {
  return normalizeRoleId(roleId) === ROLE_IDS.GUIA.toLowerCase();
}

module.exports = {
  ROLE_IDS,
  normalizeRoleId,
  isConductorRole,
  isGuiaRole,
};
