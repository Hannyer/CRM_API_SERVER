// src/controllers/activity-types.controller.js
const activityTypesService = require('../services/activity-types.service');
const { sendErrorResponse } = require('../utils/errorHandler');

/**
 * @openapi
 * /api/activity-types:
 *   get:
 *     tags: [Activity Types]
 *     summary: Obtener todos los tipos de actividad
 *     description: Retorna una lista de todos los tipos de actividad disponibles
 *     responses:
 *       200:
 *         description: Lista de tipos de actividad
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   code:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                     nullable: true
 *       500:
 *         description: Error interno del servidor
 */
async function list(req, res) {
  try {
    const activityTypes = await activityTypesService.listActivityTypes();
    res.json(activityTypes);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener tipos de actividad');
  }
}

/**
 * @openapi
 * /api/activity-types/{id}:
 *   get:
 *     tags: [Activity Types]
 *     summary: Obtener un tipo de actividad por ID
 *     description: Retorna la información de un tipo de actividad específico
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del tipo de actividad
 *     responses:
 *       200:
 *         description: Información del tipo de actividad
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 code:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                   nullable: true
 *       404:
 *         description: Tipo de actividad no encontrado
 *       500:
 *         description: Error interno del servidor
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

module.exports = {
  list,
  getById,
};

