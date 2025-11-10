const activitiesService = require('../services/activities.service');
const { AppError } = require('../utils/AppError');
const { sendErrorResponse } = require('../utils/errorHandler');

/**
 * @openapi
 * /api/activities/by-date:
 *   get:
 *     tags: [Activities]
 *     summary: Obtener actividades por fecha
 *     description: Obtiene todas las actividades programadas para una fecha específica con información completa (tipo, horarios, guías asignados, idiomas)
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: '2024-12-25'
 *         description: Fecha en formato YYYY-MM-DD
 *     responses:
 *       200:
 *         description: Lista de actividades para la fecha especificada
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ActivityByDate'
 *       400:
 *         description: Parámetro date es requerido o formato inválido
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
async function getByDate(req, res) {
  try {
    const { date } = req.query;
    
    if (!date) {
      return sendErrorResponse(res, { status: 400, message: 'date es requerido (formato YYYY-MM-DD)' });
    }
    
    // Validar formato de fecha
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return sendErrorResponse(res, { status: 400, message: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }
    
    const activities = await activitiesService.getActivitiesByDate(date);
    res.json(activities);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener actividades por fecha');
  }
}

async function list(req, res) {
  try {
    // Parsear y validar parámetros de paginación
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    
    // Validaciones
    if (page < 1) {
      return sendErrorResponse(res, { status: 400, message: 'page debe ser mayor o igual a 1' });
    }
    if (limit < 1) {
      return sendErrorResponse(res, { status: 400, message: 'limit debe ser mayor o igual a 1' });
    }
    if (limit > 100) {
      return sendErrorResponse(res, { status: 400, message: 'limit no puede ser mayor a 100' });
    }
    
    const data = await activitiesService.listActivities({ page, limit });
    
    res.json({
      items: data.items,
      pagination: {
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages
      }
    });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al listar actividades');
  }
}

/**
 * @openapi
 * /api/activities:
 *   get:
 *     tags: [Activities]
 *     summary: Listar todas las actividades
 *     description: Obtiene una lista paginada de todas las actividades registradas en el sistema
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página (por defecto 1)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Cantidad de registros por página (por defecto 10, máximo 100)
 *     responses:
 *       200:
 *         description: Lista paginada de actividades
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActivityListItem'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       description: Página actual
 *                     limit:
 *                       type: integer
 *                       description: Cantidad de registros por página
 *                     total:
 *                       type: integer
 *                       description: Total de registros
 *                     totalPages:
 *                       type: integer
 *                       description: Total de páginas
 *       400:
 *         description: Parámetros de paginación inválidos
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
 *   post:
 *     tags: [Activities]
 *     summary: Crear actividad (y asignar guías si autoAssign = true)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActivityCreateRequest'
 *     responses:
 *       201:
 *         description: Actividad creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActivityCreateResponse'
 *       400:
 *         description: Datos requeridos inválidos o faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Conflicto de asignación (solape o más de un líder)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno al crear actividad
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

async function create(req, res) {
  try {
    const payload = req.body || {};
    if (!payload.activityTypeId || !payload.title || !payload.partySize || !payload.start || !payload.end) {
      return res.status(400).json({ message: 'activityTypeId, title, partySize, start, end son requeridos' });
    }

    const result = await activitiesService.createActivityAndAssign(payload);
    res.status(201).json(result);
  } catch (e) {
    console.error(e);
    // si la BD rechaza por solape/índice único de líder
    if (String(e.message).toLowerCase().includes('exclude') || String(e.message).toLowerCase().includes('uq_one_leader_per_activity')) {
      return res.status(409).json({ message: 'Conflicto de asignación (solape o más de un líder)' });
    }
     if (e instanceof AppError) {
      return res.status(e.status).json({
        message: e.message,
        code: e.code,
        details: e.details
      });
    }
    
    res.status(500).json({ message: 'Error al crear actividad '+e.message });
  }
}

/**
 * @openapi
 * /api/activities/{id}/assignments:
 *   put:
 *     tags: [Activities]
 *     summary: Reemplazar completamente las asignaciones de guías de una actividad
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID de la actividad
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignmentReplaceRequest'
 *     responses:
 *       200:
 *         description: Asignaciones actualizadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       409:
 *         description: Conflicto de asignación (solape o más de un líder)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error al actualizar asignaciones
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function replaceAssignments(req, res) {
  try {
    const { id } = req.params;
    const { assignments } = req.body || {};
    await activitiesService.replaceAssignments(id, assignments || []);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    if (String(e.message).toLowerCase().includes('exclude') || String(e.message).toLowerCase().includes('uq_one_leader_per_activity')) {
      return res.status(409).json({ message: 'Conflicto de asignación (solape o más de un líder)' });
    }
     if (e instanceof AppError) {
      return res.status(e.status).json({
        message: e.message,
        code: e.code,
        details: e.details
      });
    }
    res.status(500).json({ message: 'Error al actualizar asignaciones' });
  }
}

/**
 * @openapi
 * /api/activities/{id}:
 *   get:
 *     tags: [Activities]
 *     summary: Obtener una actividad por ID
 *     description: Obtiene la información completa de una actividad incluyendo guías asignados e idiomas
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la actividad
 *     responses:
 *       200:
 *         description: Información de la actividad
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActivityByDate'
 *       404:
 *         description: Actividad no encontrada
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
    const activity = await activitiesService.getActivityById(id);
    
    if (!activity) {
      return sendErrorResponse(res, { status: 404, message: 'Actividad no encontrada' });
    }
    
    res.json(activity);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener actividad');
  }
}

/**
 * @openapi
 * /api/activities/{id}:
 *   put:
 *     tags: [Activities]
 *     summary: Actualizar una actividad
 *     description: Actualiza la información de una actividad existente. Solo se actualizan los campos proporcionados.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la actividad
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActivityUpdateRequest'
 *     responses:
 *       200:
 *         description: Actividad actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActivityByDate'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Actividad no encontrada
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
    const { activityTypeId, title, partySize, start, end, languageIds } = req.body || {};
    
    const activity = await activitiesService.updateActivity(id, {
      activityTypeId,
      title,
      partySize,
      start,
      end,
      languageIds
    });
    
    if (!activity) {
      return sendErrorResponse(res, { status: 404, message: 'Actividad no encontrada' });
    }
    
    res.json(activity);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al actualizar actividad');
  }
}

/**
 * @openapi
 * /api/activities/{id}:
 *   delete:
 *     tags: [Activities]
 *     summary: Eliminar una actividad
 *     description: Elimina una actividad y todas sus relaciones (asignaciones de guías e idiomas)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la actividad
 *     responses:
 *       200:
 *         description: Actividad eliminada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Actividad eliminada correctamente
 *                 activity:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     title:
 *                       type: string
 *       404:
 *         description: Actividad no encontrada
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
    const activity = await activitiesService.deleteActivity(id);
    
    if (!activity) {
      return sendErrorResponse(res, { status: 404, message: 'Actividad no encontrada' });
    }
    
    res.json({ message: 'Actividad eliminada correctamente', activity });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al eliminar actividad');
  }
}

module.exports = { getByDate, list, getById, create, update, remove, replaceAssignments };
