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
 *       400:
 *         description: Parámetro date es requerido o formato inválido
 *       500:
 *         description: Error interno del servidor
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
 *         description: Filtrar por estado (true = activas, false = inactivas, null = todas)
 *     responses:
 *       200:
 *         description: Lista paginada de actividades
 */
async function list(req, res) {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    let status = req.query.status !== undefined ? req.query.status === 'true' : null;
    
    if (page < 1) {
      return sendErrorResponse(res, { status: 400, message: 'page debe ser mayor o igual a 1' });
    }
    if (limit < 1) {
      return sendErrorResponse(res, { status: 400, message: 'limit debe ser mayor o igual a 1' });
    }
    if (limit > 100) {
      return sendErrorResponse(res, { status: 400, message: 'limit no puede ser mayor a 100' });
    }
    
    const data = await activitiesService.listActivities({ page, limit, status });
    
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
 *   post:
 *     tags: [Activities]
 *     summary: Crear actividad
 *     description: Crea una nueva actividad. Las fechas se pueden agregar como planeaciones después.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activityTypeId
 *               - title
 *               - partySize
 *             properties:
 *               activityTypeId:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *               partySize:
 *                 type: integer
 *               status:
 *                 type: boolean
 *                 default: true
 *               languageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       201:
 *         description: Actividad creada
 *       400:
 *         description: Datos requeridos inválidos o faltantes
 */
async function create(req, res) {
  try {
    const payload = req.body || {};
    if (!payload.activityTypeId || !payload.title || payload.partySize === undefined) {
      return res.status(400).json({ message: 'activityTypeId, title, partySize son requeridos' });
    }

    const result = await activitiesService.createActivity(payload);
    res.status(201).json(result);
  } catch (e) {
    console.error(e);
    if (e instanceof AppError) {
      return res.status(e.status).json({
        message: e.message,
        code: e.code,
        details: e.details
      });
    }
    res.status(500).json({ message: 'Error al crear actividad: ' + e.message });
  }
}

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
 *     description: Obtiene la información completa de una actividad incluyendo guías asignados, idiomas y planeaciones
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
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const { activityTypeId, title, partySize, status, languageIds } = req.body || {};
    
    const activity = await activitiesService.updateActivity(id, {
      activityTypeId,
      title,
      partySize,
      status,
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
 * /api/activities/{id}/toggle-status:
 *   put:
 *     tags: [Activities]
 *     summary: Activar o inactivar una actividad
 *     description: Cambia el estado de una actividad (activa/inactiva)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       404:
 *         description: Actividad no encontrada
 */
async function toggleStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    
    if (typeof status !== 'boolean') {
      return sendErrorResponse(res, { status: 400, message: 'status debe ser un booleano (true/false)' });
    }
    
    const activity = await activitiesService.toggleActivityStatus(id, status);
    
    if (!activity) {
      return sendErrorResponse(res, { status: 404, message: 'Actividad no encontrada' });
    }
    
    res.json(activity);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al cambiar estado de actividad');
  }
}

/**
 * @openapi
 * /api/activities/{id}:
 *   delete:
 *     tags: [Activities]
 *     summary: Eliminar una actividad (soft delete)
 *     description: Inactiva una actividad cambiando su status a false
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

// ========== CONTROLADORES PARA PLANEACIONES ==========

/**
 * @openapi
 * /api/activities/{activityId}/schedules:
 *   get:
 *     tags: [Activities]
 *     summary: Obtener todas las planeaciones de una actividad
 *     description: Retorna todas las planeaciones (fechas/horas) asociadas a una actividad
 */
async function getSchedules(req, res) {
  try {
    const { activityId } = req.params;
    const schedules = await activitiesService.getSchedulesByActivityId(activityId);
    res.json(schedules);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener planeaciones');
  }
}

/**
 * @openapi
 * /api/activities/{activityId}/schedules:
 *   post:
 *     tags: [Activities]
 *     summary: Crear una nueva planeación para una actividad
 *     description: Agrega una nueva fecha/hora programada para una actividad existente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduledStart
 *               - scheduledEnd
 *             properties:
 *               scheduledStart:
 *                 type: string
 *                 format: date-time
 *               scheduledEnd:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Planeación creada
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Actividad no encontrada
 */
async function createSchedule(req, res) {
  try {
    const { activityId } = req.params;
    const { scheduledStart, scheduledEnd, capacity = 0, status = true } = req.body || {};
    
    if (!scheduledStart || !scheduledEnd) {
      return sendErrorResponse(res, { status: 400, message: 'scheduledStart y scheduledEnd son requeridos' });
    }
    
    // Verificar que la actividad existe
    const activity = await activitiesService.getActivityById(activityId);
    if (!activity) {
      return sendErrorResponse(res, { status: 404, message: 'Actividad no encontrada' });
    }
    
    const schedule = await activitiesService.createSchedule(activityId, {
      scheduledStart,
      scheduledEnd,
      capacity,
      status
    });
    
    res.status(201).json(schedule);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al crear planeación');
  }
}

/**
 * @openapi
 * /api/activities/schedules/{scheduleId}:
 *   get:
 *     tags: [Activities]
 *     summary: Obtener una planeación por ID
 */
async function getScheduleById(req, res) {
  try {
    const { scheduleId } = req.params;
    const schedule = await activitiesService.getScheduleById(scheduleId);
    
    if (!schedule) {
      return sendErrorResponse(res, { status: 404, message: 'Planeación no encontrada' });
    }
    
    res.json(schedule);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener planeación');
  }
}

/**
 * @openapi
 * /api/activities/schedules/{scheduleId}:
 *   put:
 *     tags: [Activities]
 *     summary: Actualizar una planeación
 *     description: Actualiza los datos de una planeación existente
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scheduledStart:
 *                 type: string
 *                 format: date-time
 *               scheduledEnd:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Planeación actualizada
 *       404:
 *         description: Planeación no encontrada
 */
async function updateSchedule(req, res) {
  try {
    const { scheduleId } = req.params;
    const { scheduledStart, scheduledEnd, capacity, status } = req.body || {};
    
    const schedule = await activitiesService.updateSchedule(scheduleId, {
      scheduledStart,
      scheduledEnd,
      capacity,
      status
    });
    
    if (!schedule) {
      return sendErrorResponse(res, { status: 404, message: 'Planeación no encontrada' });
    }
    
    res.json(schedule);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al actualizar planeación');
  }
}

/**
 * @openapi
 * /api/activities/schedules/{scheduleId}/toggle-status:
 *   put:
 *     tags: [Activities]
 *     summary: Activar o inactivar una planeación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: boolean
 */
async function toggleScheduleStatus(req, res) {
  try {
    const { scheduleId } = req.params;
    const { status } = req.body || {};
    
    if (typeof status !== 'boolean') {
      return sendErrorResponse(res, { status: 400, message: 'status debe ser un booleano (true/false)' });
    }
    
    const schedule = await activitiesService.toggleScheduleStatus(scheduleId, status);
    
    if (!schedule) {
      return sendErrorResponse(res, { status: 404, message: 'Planeación no encontrada' });
    }
    
    res.json(schedule);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al cambiar estado de planeación');
  }
}

/**
 * @openapi
 * /api/activities/schedules/{scheduleId}:
 *   delete:
 *     tags: [Activities]
 *     summary: Eliminar una planeación (soft delete)
 *     description: Inactiva una planeación cambiando su status a false
 */
async function deleteSchedule(req, res) {
  try {
    const { scheduleId } = req.params;
    const schedule = await activitiesService.deleteSchedule(scheduleId);
    
    if (!schedule) {
      return sendErrorResponse(res, { status: 404, message: 'Planeación no encontrada' });
    }
    
    res.json({ message: 'Planeación eliminada correctamente', schedule });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al eliminar planeación');
  }
}

// ========== CONTROLADORES PARA CAPACIDAD Y RESERVAS ==========

/**
 * @openapi
 * /api/activities/{activityId}/schedules/bulk:
 *   post:
 *     tags: [Activities]
 *     summary: Inserción masiva de horarios
 *     description: Crea múltiples horarios para una actividad en un rango de fechas con validación de solapamientos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startDate
 *               - endDate
 *               - timeSlots
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: '2024-03-01'
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: '2024-03-10'
 *               timeSlots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - startTime
 *                     - endTime
 *                     - capacity
 *                   properties:
 *                     startTime:
 *                       type: string
 *                       format: time
 *                       example: '08:00'
 *                     endTime:
 *                       type: string
 *                       format: time
 *                       example: '11:00'
 *                     capacity:
 *                       type: integer
 *                       example: 20
 *               validateOverlaps:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Horarios creados exitosamente
 *       400:
 *         description: Datos inválidos o conflictos de horarios
 */
async function bulkCreateSchedules(req, res) {
  try {
    const { activityId } = req.params;
    const { startDate, endDate, timeSlots, validateOverlaps = true } = req.body || {};
    
    if (!startDate || !endDate || !timeSlots) {
      return sendErrorResponse(res, { 
        status: 400, 
        message: 'startDate, endDate y timeSlots son requeridos' 
      });
    }

    if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
      return sendErrorResponse(res, { 
        status: 400, 
        message: 'timeSlots debe ser un array no vacío' 
      });
    }

    const result = await activitiesService.bulkCreateSchedules(
      activityId,
      startDate,
      endDate,
      timeSlots,
      validateOverlaps
    );

    res.status(201).json(result);
  } catch (e) {
    console.error(e);
    
    // Manejar errores específicos
    if (e.code === 'SCHEDULE_CONFLICTS') {
      return res.status(409).json({
        message: e.message || 'Se encontraron conflictos de horarios',
        code: e.code,
        conflicts: e.conflicts
      });
    }
    
    if (e.code === 'ACTIVITY_NOT_FOUND') {
      return sendErrorResponse(res, { status: 404, message: e.message || 'Actividad no encontrada' });
    }

    sendErrorResponse(res, e, 500, 'Error al crear horarios masivamente');
  }
}

/**
 * @openapi
 * /api/activities/schedules/{scheduleId}/attendees:
 *   post:
 *     tags: [Activities]
 *     summary: Sumar asistentes a un horario
 *     description: Agrega una cantidad de asistentes a un horario específico con validación de capacidad
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 3
 *     responses:
 *       200:
 *         description: Asistentes agregados exitosamente
 *       409:
 *         description: Capacidad excedida
 *       404:
 *         description: Horario no encontrado
 */
async function addAttendeesToSchedule(req, res) {
  try {
    const { scheduleId } = req.params;
    const { quantity } = req.body || {};
    
    if (!quantity || quantity <= 0) {
      return sendErrorResponse(res, { 
        status: 400, 
        message: 'quantity debe ser un número mayor a 0' 
      });
    }

    const result = await activitiesService.addAttendeesToSchedule(scheduleId, quantity);
    res.json(result);
  } catch (e) {
    console.error(e);
    
    if (e instanceof AppError && e.code === 'CAPACITY_EXCEEDED') {
      return res.status(409).json({
        message: e.message,
        code: e.code,
        details: e.details
      });
    }
    
    if (e instanceof AppError && e.status === 404) {
      return sendErrorResponse(res, { status: 404, message: e.message });
    }

    sendErrorResponse(res, e, 500, 'Error al agregar asistentes');
  }
}

/**
 * @openapi
 * /api/activities/schedules/availability:
 *   get:
 *     tags: [Activities]
 *     summary: Consultar disponibilidad de horarios
 *     description: Obtiene información de disponibilidad de horarios con filtros opcionales
 *     parameters:
 *       - in: query
 *         name: activityId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por ID de actividad
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del rango
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del rango
 *     responses:
 *       200:
 *         description: Lista de horarios con disponibilidad
 */
async function getScheduleAvailability(req, res) {
  try {
    const { activityId, startDate, endDate } = req.query;
    
    const filters = {};
    if (activityId) filters.activityId = activityId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const availability = await activitiesService.getScheduleAvailability(filters);
    res.json(availability);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al consultar disponibilidad');
  }
}

/**
 * @openapi
 * /api/activities/{activityId}/schedules/available:
 *   get:
 *     tags: [Activities]
 *     summary: Obtener horarios disponibles por día
 *     description: Obtiene los horarios disponibles (con espacios) para una actividad en una fecha específica
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: '2024-03-15'
 *     responses:
 *       200:
 *         description: Lista de horarios disponibles
 */
async function getAvailableSchedulesByDate(req, res) {
  try {
    const { activityId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return sendErrorResponse(res, { 
        status: 400, 
        message: 'date es requerido (formato YYYY-MM-DD)' 
      });
    }

    // Validar formato de fecha
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return sendErrorResponse(res, { 
        status: 400, 
        message: 'Formato de fecha inválido. Use YYYY-MM-DD' 
      });
    }

    const schedules = await activitiesService.getAvailableSchedulesByDate(activityId, date);
    res.json(schedules);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener horarios disponibles');
  }
}

module.exports = { 
  getByDate, 
  list, 
  getById, 
  create, 
  update, 
  toggleStatus,
  remove, 
  replaceAssignments,
  // Planeaciones
  getSchedules,
  createSchedule,
  getScheduleById,
  updateSchedule,
  toggleScheduleStatus,
  deleteSchedule,
  // Capacidad y reservas
  bulkCreateSchedules,
  addAttendeesToSchedule,
  getScheduleAvailability,
  getAvailableSchedulesByDate,
};
