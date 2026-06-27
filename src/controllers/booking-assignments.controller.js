// src/controllers/booking-assignments.controller.js
const assignmentsService = require('../services/booking-assignments.service');
const { AppError } = require('../utils/AppError');
const { sendErrorResponse } = require('../utils/errorHandler');

/**
 * @openapi
 * /api/booking-assignments/guides/available:
 *   get:
 *     tags: [BookingAssignments]
 *     summary: Obtener guías disponibles
 *     description: Lista todos los usuarios con rol Guía que están activos y disponibles para asignar
 *     responses:
 *       200:
 *         description: Lista de guías disponibles
 *       500:
 *         description: Error interno del servidor
 */
async function getAvailableGuides(req, res) {
  try {
    const guides = await assignmentsService.getAvailableGuides(req.query.bookingId || null);
    res.json(guides);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener guías disponibles');
  }
}

async function listScheduleGuideAssignments(req, res) {
  try {
    const assignments = await assignmentsService.listScheduleGuideAssignments();
    res.json(assignments);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener salidas con guías asignados');
  }
}

async function getAvailableGuidesBySchedule(req, res) {
  try {
    const { activityScheduleId } = req.params;
    const guides = await assignmentsService.getAvailableGuidesByScheduleId(activityScheduleId);
    res.json(guides);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener guías disponibles para la salida');
  }
}

async function assignScheduleGuides(req, res) {
  try {
    const { activityScheduleId } = req.params;
    const { guideIds = [] } = req.body;

    if (!Array.isArray(guideIds)) {
      return res.status(400).json({ message: 'guideIds debe ser un array' });
    }

    const result = await assignmentsService.assignScheduleGuides(activityScheduleId, guideIds);
    res.json(result);
  } catch (e) {
    console.error(e);
    if (e instanceof AppError) {
      return res.status(e.status).json({ message: e.message, code: e.code });
    }
    sendErrorResponse(res, e, 500, 'Error al asignar guías a la salida');
  }
}

/**
 * @openapi
 * /api/booking-assignments/{bookingId}:
 *   get:
 *     tags: [BookingAssignments]
 *     summary: Obtener asignaciones de una reserva
 *     description: Retorna los guías y transporte asignados a una reserva específica
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Asignaciones de la reserva
 *       404:
 *         description: Reserva no encontrada
 *       500:
 *         description: Error interno del servidor
 */
async function getAssignments(req, res) {
  try {
    const { bookingId } = req.params;
    const assignments = await assignmentsService.getAssignments(bookingId);
    res.json(assignments);
  } catch (e) {
    console.error(e);
    if (e instanceof AppError) {
      return res.status(e.status).json({ message: e.message, code: e.code });
    }
    sendErrorResponse(res, e, 500, 'Error al obtener asignaciones');
  }
}

/**
 * @openapi
 * /api/booking-assignments/{bookingId}/guides:
 *   put:
 *     tags: [BookingAssignments]
 *     summary: Asignar guías a una reserva
 *     description: Reemplaza los guías asignados a la reserva. Máximo 5 guías.
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [guideIds]
 *             properties:
 *               guideIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 maxItems: 5
 *                 description: IDs de los guías a asignar
 *     responses:
 *       200:
 *         description: Guías asignados correctamente
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Reserva no encontrada
 *       500:
 *         description: Error interno del servidor
 */
async function assignGuides(req, res) {
  try {
    const { bookingId } = req.params;
    const { guideIds = [] } = req.body;

    if (!Array.isArray(guideIds)) {
      return res.status(400).json({ message: 'guideIds debe ser un array' });
    }

    const result = await assignmentsService.assignGuides(bookingId, guideIds);
    res.json(result);
  } catch (e) {
    console.error(e);
    if (e instanceof AppError) {
      return res.status(e.status).json({ message: e.message, code: e.code });
    }
    sendErrorResponse(res, e, 500, 'Error al asignar guías');
  }
}

/**
 * @openapi
 * /api/booking-assignments/{bookingId}/transport:
 *   put:
 *     tags: [BookingAssignments]
 *     summary: Asignar transporte a una reserva
 *     description: Asigna un vehículo a la reserva. Enviar transportId null para desasignar.
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transportId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: ID del transporte a asignar, o null para desasignar
 *     responses:
 *       200:
 *         description: Transporte asignado correctamente
 *       400:
 *         description: Datos inválidos o reserva no requiere transporte
 *       404:
 *         description: Reserva o transporte no encontrado
 *       500:
 *         description: Error interno del servidor
 */
async function assignTransport(req, res) {
  try {
    const { bookingId } = req.params;
    const { transportId = null } = req.body;

    const result = await assignmentsService.assignTransport(bookingId, transportId);
    res.json(result);
  } catch (e) {
    console.error(e);
    if (e instanceof AppError) {
      return res.status(e.status).json({ message: e.message, code: e.code });
    }
    sendErrorResponse(res, e, 500, 'Error al asignar transporte');
  }
}

/**
 * @openapi
 * /api/booking-assignments/{bookingId}/confirm:
 *   put:
 *     tags: [BookingAssignments]
 *     summary: Confirmar una reserva
 *     description: Cambia el estado de la reserva a 'confirmed'. Requiere al menos 1 guía asignado y transporte si aplica.
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Reserva confirmada exitosamente
 *       400:
 *         description: Condiciones no cumplidas para confirmar
 *       404:
 *         description: Reserva no encontrada
 *       500:
 *         description: Error interno del servidor
 */
async function confirmBooking(req, res) {
  try {
    const { bookingId } = req.params;
    const result = await assignmentsService.confirmBooking(bookingId);
    res.json(result);
  } catch (e) {
    console.error(e);
    if (e instanceof AppError) {
      return res.status(e.status).json({ message: e.message, code: e.code });
    }
    sendErrorResponse(res, e, 500, 'Error al confirmar la reserva');
  }
}

module.exports = {
  getAvailableGuides,
  listScheduleGuideAssignments,
  getAvailableGuidesBySchedule,
  assignScheduleGuides,
  getAssignments,
  assignGuides,
  assignTransport,
  confirmBooking,
};
