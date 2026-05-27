const usersService = require('../services/users.service');
const { sendErrorResponse } = require('../utils/errorHandler');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateRequiredText(value, fieldName) {
  if (value === undefined || value === null || typeof value !== 'string' || !value.trim()) {
    return `${fieldName} es requerido`;
  }
  return null;
}

function validateEmail(email) {
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return 'email es requerido y debe tener un formato válido';
  }
  return null;
}

function validateRoleId(roleId) {
  if (!roleId) return 'roleId es requerido';
  if (typeof roleId !== 'string' || !UUID_REGEX.test(roleId.trim())) {
    return 'roleId debe ser un UUID válido';
  }
  return null;
}

function validateLicenseExpirationDateFormat(licenseExpirationDate) {
  if (
    licenseExpirationDate !== undefined &&
    licenseExpirationDate !== null &&
    licenseExpirationDate !== ''
  ) {
    if (typeof licenseExpirationDate !== 'string' || !DATE_REGEX.test(licenseExpirationDate)) {
      return 'licenseExpirationDate debe tener formato YYYY-MM-DD';
    }
  }
  return null;
}

function validateSpeaksEnglish(value) {
  if (value !== undefined && typeof value !== 'boolean') {
    return 'speaksEnglish debe ser un valor booleano';
  }
  return null;
}

function validateCreateBody(body) {
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
  } = body || {};

  const checks = [
    validateRequiredText(cedula, 'cedula'),
    validateEmail(email),
    validateRequiredText(fullName, 'fullName'),
    validateRequiredText(phone, 'phone'),
    validateRequiredText(password, 'password'),
    validateRoleId(roleId),
    validateLicenseExpirationDateFormat(licenseExpirationDate),
    validateSpeaksEnglish(speaksEnglish),
  ];

  if (status !== undefined && typeof status !== 'boolean') {
    checks.push('status debe ser un valor booleano');
  }

  return checks.find(Boolean) || null;
}

function validateUpdateBody(body) {
  const { cedula, email, fullName, phone, roleId, licenseExpirationDate, speaksEnglish, status } =
    body || {};

  if (cedula !== undefined) {
    const err = validateRequiredText(cedula, 'cedula');
    if (err) return err;
  }
  if (email !== undefined) {
    const err = validateEmail(email);
    if (err) return err;
  }
  if (fullName !== undefined) {
    const err = validateRequiredText(fullName, 'fullName');
    if (err) return err;
  }
  if (phone !== undefined) {
    const err = validateRequiredText(phone, 'phone');
    if (err) return err;
  }
  if (roleId !== undefined) {
    const err = validateRoleId(roleId);
    if (err) return err;
  }

  const licenseErr = validateLicenseExpirationDateFormat(licenseExpirationDate);
  if (licenseErr) return licenseErr;

  const speaksErr = validateSpeaksEnglish(speaksEnglish);
  if (speaksErr) return speaksErr;

  if (status !== undefined && typeof status !== 'boolean') {
    return 'status debe ser un valor booleano';
  }

  return null;
}

/**
 * @openapi
 * /api/users/roles:
 *   get:
 *     tags: [Users]
 *     summary: Listar roles de usuario disponibles
 *     responses:
 *       200:
 *         description: Roles activos (value = roleId UUID)
 */
async function listRoles(req, res) {
  try {
    const roles = await usersService.getAvailableRoles();
    res.json(roles);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al listar roles');
  }
}

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Listar usuarios
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: boolean }
 *       - in: query
 *         name: roleId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lista paginada
 */
async function list(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const status =
      req.query.status !== undefined ? req.query.status === 'true' : null;
    const roleId = req.query.roleId || null;

    if (page < 1) {
      return sendErrorResponse(res, { status: 400, message: 'page debe ser mayor o igual a 1' });
    }
    if (limit < 1) {
      return sendErrorResponse(res, { status: 400, message: 'limit debe ser mayor o igual a 1' });
    }
    if (limit > 100) {
      return sendErrorResponse(res, { status: 400, message: 'limit no puede ser mayor a 100' });
    }
    if (roleId && !UUID_REGEX.test(roleId)) {
      return sendErrorResponse(res, { status: 400, message: 'roleId de filtro inválido' });
    }

    const data = await usersService.listUsers({ page, limit, status, roleId });
    res.json({
      items: data.items,
      pagination: {
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages,
      },
    });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al listar usuarios');
  }
}

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Obtener usuario por ID
 */
async function getById(req, res) {
  try {
    const user = await usersService.getUserById(req.params.id);
    if (!user) {
      return sendErrorResponse(res, { status: 404, message: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener usuario');
  }
}

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Crear usuario
 */
async function create(req, res) {
  try {
    const validationError = validateCreateBody(req.body);
    if (validationError) {
      return sendErrorResponse(res, { status: 400, message: validationError });
    }

    const user = await usersService.createUser(req.body);
    res.status(201).json(user);
  } catch (e) {
    console.error(e);
    if (String(e.message).toLowerCase().includes('unique') || e?.code === '23505') {
      return sendErrorResponse(res, {
        status: 409,
        message: 'Ya existe un usuario con esa cédula o correo',
      });
    }
    sendErrorResponse(res, e, 500, 'Error al crear usuario');
  }
}

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Actualizar usuario
 */
async function update(req, res) {
  try {
    const validationError = validateUpdateBody(req.body);
    if (validationError) {
      return sendErrorResponse(res, { status: 400, message: validationError });
    }

    const user = await usersService.updateUser(req.params.id, req.body || {});
    if (!user) {
      return sendErrorResponse(res, { status: 404, message: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (e) {
    console.error(e);
    if (String(e.message).toLowerCase().includes('unique') || e?.code === '23505') {
      return sendErrorResponse(res, {
        status: 409,
        message: 'Ya existe un usuario con esa cédula o correo',
      });
    }
    sendErrorResponse(res, e, 500, 'Error al actualizar usuario');
  }
}

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Eliminar usuario (soft delete)
 */
async function remove(req, res) {
  try {
    const user = await usersService.deleteUser(req.params.id);
    if (!user) {
      return sendErrorResponse(res, { status: 404, message: 'Usuario no encontrado' });
    }
    res.json({ message: 'Usuario eliminado correctamente', user });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al eliminar usuario');
  }
}

module.exports = { listRoles, list, getById, create, update, remove };
