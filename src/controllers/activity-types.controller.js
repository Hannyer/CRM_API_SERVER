const activityTypesService = require('../services/activity-types.service');
const { sendErrorResponse } = require('../utils/errorHandler');

function validateName(name) {
  if (name === undefined || name === null || typeof name !== 'string' || !name.trim()) {
    return 'name es requerido';
  }
  return null;
}

function validateStatus(status) {
  if (status !== undefined && typeof status !== 'boolean') {
    return 'status debe ser un valor booleano';
  }
  return null;
}

function validateDescription(description) {
  if (description !== undefined && description !== null && typeof description !== 'string') {
    return 'description debe ser texto o null';
  }
  return null;
}

/**
 * @openapi
 * /api/activity-types:
 *   get:
 *     tags: [Activity Types]
 *     summary: Listar tipos de actividad
 *     description: Obtiene una lista paginada de tipos de actividad
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado (true = activos, false = inactivos)
 *     responses:
 *       200:
 *         description: Lista paginada de tipos de actividad
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActivityTypeListItem'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function list(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const status =
      req.query.status !== undefined ? req.query.status === 'true' : null;

    if (page < 1) {
      return sendErrorResponse(res, { status: 400, message: 'page debe ser mayor o igual a 1' });
    }
    if (limit < 1) {
      return sendErrorResponse(res, { status: 400, message: 'limit debe ser mayor o igual a 1' });
    }
    if (limit > 100) {
      return sendErrorResponse(res, { status: 400, message: 'limit no puede ser mayor a 100' });
    }

    const data = await activityTypesService.listActivityTypes({ page, limit, status });

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
    sendErrorResponse(res, e, 500, 'Error al listar tipos de actividad');
  }
}

/**
 * @openapi
 * /api/activity-types/{id}:
 *   get:
 *     tags: [Activity Types]
 *     summary: Obtener un tipo de actividad por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Tipo de actividad encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActivityType'
 *       404:
 *         description: Tipo de actividad no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function getById(req, res) {
  try {
    const { id } = req.params;
    const activityType = await activityTypesService.getActivityTypeById(id);

    if (!activityType) {
      return sendErrorResponse(res, { status: 404, message: 'Tipo de actividad no encontrado' });
    }

    res.json(activityType);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener tipo de actividad');
  }
}

/**
 * @openapi
 * /api/activity-types:
 *   post:
 *     tags: [Activity Types]
 *     summary: Crear un tipo de actividad
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActivityTypeCreateRequest'
 *     responses:
 *       201:
 *         description: Tipo de actividad creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActivityType'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Ya existe un tipo de actividad con ese nombre
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function create(req, res) {
  try {
    const { name, description, status = true } = req.body || {};

    const nameError = validateName(name);
    if (nameError) {
      return sendErrorResponse(res, { status: 400, message: nameError });
    }

    const statusError = validateStatus(status);
    if (statusError) {
      return sendErrorResponse(res, { status: 400, message: statusError });
    }

    const descriptionError = validateDescription(description);
    if (descriptionError) {
      return sendErrorResponse(res, { status: 400, message: descriptionError });
    }

    const activityType = await activityTypesService.createActivityType({
      name,
      description,
      status,
    });
    res.status(201).json(activityType);
  } catch (e) {
    console.error(e);
    if (String(e.message).toLowerCase().includes('unique') || e?.code === '23505') {
      return sendErrorResponse(res, {
        status: 409,
        message: 'Ya existe un tipo de actividad con ese nombre',
      });
    }
    sendErrorResponse(res, e, 500, 'Error al crear tipo de actividad');
  }
}

/**
 * @openapi
 * /api/activity-types/{id}:
 *   put:
 *     tags: [Activity Types]
 *     summary: Actualizar un tipo de actividad
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActivityTypeUpdateRequest'
 *     responses:
 *       200:
 *         description: Tipo de actividad actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActivityType'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tipo de actividad no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Ya existe un tipo de actividad con ese nombre
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body || {};

    if (name !== undefined) {
      const nameError = validateName(name);
      if (nameError) {
        return sendErrorResponse(res, { status: 400, message: nameError });
      }
    }

    const statusError = validateStatus(status);
    if (statusError) {
      return sendErrorResponse(res, { status: 400, message: statusError });
    }

    const descriptionError = validateDescription(description);
    if (descriptionError) {
      return sendErrorResponse(res, { status: 400, message: descriptionError });
    }

    const activityType = await activityTypesService.updateActivityType(id, {
      name,
      description,
      status,
    });

    if (!activityType) {
      return sendErrorResponse(res, { status: 404, message: 'Tipo de actividad no encontrado' });
    }

    res.json(activityType);
  } catch (e) {
    console.error(e);
    if (String(e.message).toLowerCase().includes('unique') || e?.code === '23505') {
      return sendErrorResponse(res, {
        status: 409,
        message: 'Ya existe un tipo de actividad con ese nombre',
      });
    }
    sendErrorResponse(res, e, 500, 'Error al actualizar tipo de actividad');
  }
}

/**
 * @openapi
 * /api/activity-types/{id}:
 *   delete:
 *     tags: [Activity Types]
 *     summary: Eliminar un tipo de actividad (soft delete)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Tipo de actividad eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tipo de actividad eliminado correctamente
 *                 activityType:
 *                   $ref: '#/components/schemas/ActivityTypeListItem'
 *       404:
 *         description: Tipo de actividad no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function remove(req, res) {
  try {
    const { id } = req.params;
    const activityType = await activityTypesService.deleteActivityType(id);

    if (!activityType) {
      return sendErrorResponse(res, { status: 404, message: 'Tipo de actividad no encontrado' });
    }

    res.json({
      message: 'Tipo de actividad eliminado correctamente',
      activityType,
    });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al eliminar tipo de actividad');
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
