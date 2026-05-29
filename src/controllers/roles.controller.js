const rolesService = require('../services/roles.service');
const { sendErrorResponse } = require('../utils/errorHandler');

/**
 * @openapi
 * /api/roles:
 *   get:
 *     tags: [Roles]
 *     summary: Listar roles
 *     description: Lista paginada del catálogo de roles de usuario
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 50 }
 *       - in: query
 *         name: status
 *         schema: { type: boolean }
 *         description: Filtrar por estado (true/false)
 *     responses:
 *       200:
 *         description: Lista paginada de roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RoleListItem'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function list(req, res) {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 50;
    const status =
      req.query.status !== undefined ? req.query.status === 'true' : null;

    if (page < 1) {
      return sendErrorResponse(res, { status: 400, message: 'page debe ser mayor o igual a 1' });
    }
    if (limit < 1 || limit > 100) {
      return sendErrorResponse(res, {
        status: 400,
        message: 'limit debe estar entre 1 y 100',
      });
    }

    const data = await rolesService.listRoles({ page, limit, status });
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
    sendErrorResponse(res, e, 500, 'Error al listar roles');
  }
}

/**
 * @openapi
 * /api/roles/select:
 *   get:
 *     tags: [Roles]
 *     summary: Roles activos para selectores
 *     description: Devuelve id, name y description de roles activos (útil en formularios de usuario)
 *     responses:
 *       200:
 *         description: Lista de roles activos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RoleSelectItem'
 */
async function listForSelect(req, res) {
  try {
    const roles = await rolesService.listActiveRolesForSelect();
    res.json(
      roles.map((r) => ({
        value: r.id,
        label: r.name,
        description: r.description,
        requiresLicense: r.requiresLicense,
        requiresLanguages: r.requiresLanguages,
      }))
    );
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al listar roles');
  }
}

/**
 * @openapi
 * /api/roles/{id}:
 *   get:
 *     tags: [Roles]
 *     summary: Obtener rol por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Rol encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Role'
 *       404:
 *         description: Rol no encontrado
 */
async function getById(req, res) {
  try {
    const role = await rolesService.getRoleById(req.params.id);
    if (!role) {
      return sendErrorResponse(res, { status: 404, message: 'Rol no encontrado' });
    }
    res.json(role);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener rol');
  }
}

/**
 * @openapi
 * /api/roles:
 *   post:
 *     tags: [Roles]
 *     summary: Crear rol
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoleCreateRequest'
 *     responses:
 *       201:
 *         description: Rol creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Role'
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: Nombre duplicado
 */
async function create(req, res) {
  try {
    const {
      name,
      description,
      requiresLicense = false,
      requiresLanguages = false,
      status = true,
    } = req.body || {};
    if (!name) {
      return sendErrorResponse(res, { status: 400, message: 'name es requerido' });
    }

    const role = await rolesService.createRole({
      name,
      description,
      requiresLicense,
      requiresLanguages,
      status,
    });
    res.status(201).json(role);
  } catch (e) {
    console.error(e);
    if (String(e.message).toLowerCase().includes('unique') || e?.code === '23505') {
      return sendErrorResponse(res, { status: 409, message: 'Ya existe un rol con ese nombre' });
    }
    sendErrorResponse(res, e, e.status || 500, 'Error al crear rol');
  }
}

/**
 * @openapi
 * /api/roles/{id}:
 *   put:
 *     tags: [Roles]
 *     summary: Actualizar rol
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoleUpdateRequest'
 *     responses:
 *       200:
 *         description: Rol actualizado
 *       404:
 *         description: Rol no encontrado
 *       409:
 *         description: Nombre duplicado
 */
async function update(req, res) {
  try {
    const { name, description, requiresLicense, requiresLanguages, status } = req.body || {};
    const role = await rolesService.updateRole(req.params.id, {
      name,
      description,
      requiresLicense,
      requiresLanguages,
      status,
    });
    if (!role) {
      return sendErrorResponse(res, { status: 404, message: 'Rol no encontrado' });
    }
    res.json(role);
  } catch (e) {
    console.error(e);
    if (String(e.message).toLowerCase().includes('unique') || e?.code === '23505') {
      return sendErrorResponse(res, { status: 409, message: 'Ya existe un rol con ese nombre' });
    }
    sendErrorResponse(res, e, e.status || 500, 'Error al actualizar rol');
  }
}

/**
 * @openapi
 * /api/roles/{id}:
 *   delete:
 *     tags: [Roles]
 *     summary: Desactivar rol (soft delete)
 *     description: Cambia status a false. Falla si hay usuarios asignados (tras migración role_id).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Rol desactivado
 *       404:
 *         description: Rol no encontrado
 *       409:
 *         description: Rol en uso por usuarios
 */
async function remove(req, res) {
  try {
    const role = await rolesService.deleteRole(req.params.id);
    if (!role) {
      return sendErrorResponse(res, { status: 404, message: 'Rol no encontrado' });
    }
    res.json({ message: 'Rol desactivado correctamente', role });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, e.status || 500, 'Error al desactivar rol');
  }
}

module.exports = { list, listForSelect, getById, create, update, remove };
