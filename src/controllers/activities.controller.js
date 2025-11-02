const activitiesService = require('../services/activities.service');
const { AppError } = require('../utils/AppError');

/**
 * @openapi
 * /api/activities:
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

module.exports = { create, replaceAssignments };
