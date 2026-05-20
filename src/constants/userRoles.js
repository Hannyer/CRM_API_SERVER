const USER_ROLES = Object.freeze({
  ADMIN: 'administrador',
  DRIVER: 'conductor',
  RECEPTIONIST: 'recepcionista',
  OPERATOR: 'operador',
  GUIDE: 'guia',
});

const USER_ROLE_VALUES = Object.values(USER_ROLES);

const USER_ROLE_LABELS = Object.freeze({
  admin: 'Administrador',
  driver: 'Conductor',
  receptionist: 'Recepcionista',
  operator: 'Operador',
  guide: 'Guía',
});

module.exports = {
  USER_ROLES,
  USER_ROLE_VALUES,
  USER_ROLE_LABELS,
  DRIVER_ROLE: USER_ROLES.DRIVER,
};
