const referencePointsService = require('../services/reference-points.service');
const { AppError } = require('../utils/AppError');
const { sendErrorResponse } = require('../utils/errorHandler');

/**
 * @openapi
 * /api/reference-points:
 *   get:
 *     tags: [Reference Points]
 *     summary: Listar puntos de referencia
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
 *     responses:
 *       200:
 *         description: Lista paginada
 */
async function list(req, res) {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    const status =
      req.query.status !== undefined ? req.query.status === 'true' : null;

    if (page < 1) {
      return sendErrorResponse(res, { status: 400, message: 'page debe ser mayor o igual a 1' });
    }
    if (limit < 1 || limit > 100) {
      return sendErrorResponse(res, { status: 400, message: 'limit debe estar entre 1 y 100' });
    }

    const data = await referencePointsService.listReferencePoints({ page, limit, status });

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
    sendErrorResponse(res, e, 500, 'Error al listar puntos de referencia');
  }
}

/**
 * @openapi
 * /api/reference-points/select:
 *   get:
 *     tags: [Reference Points]
 *     summary: Listar puntos de referencia activos para selects
 *     description: Devuelve puntos de referencia activos para combos de cualquier módulo autenticado. No requiere permiso del módulo reference-points.
 *     responses:
 *       200:
 *         description: Lista de puntos de referencia activos
 */
async function select(_req, res) {
  try {
    const data = await referencePointsService.listReferencePoints({
      page: 1,
      limit: 100,
      status: true,
    });

    res.json({ items: data.items });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al listar puntos de referencia activos');
  }
}

async function getById(req, res) {
  try {
    const item = await referencePointsService.getReferencePointById(req.params.id);
    if (!item) {
      return sendErrorResponse(res, { status: 404, message: 'Punto de referencia no encontrado' });
    }
    res.json(item);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener punto de referencia');
  }
}

async function create(req, res) {
  try {
    const { description, status = true } = req.body || {};
    const userId = req.user?.id || null;

    const item = await referencePointsService.createReferencePoint(
      { description, status },
      userId
    );
    res.status(201).json(item);
  } catch (e) {
    console.error(e);
    if (e instanceof AppError) {
      return sendErrorResponse(res, { status: e.status, message: e.message, code: e.code });
    }
    sendErrorResponse(res, e, 500, 'Error al crear punto de referencia');
  }
}

async function update(req, res) {
  try {
    const { description, status } = req.body || {};
    const userId = req.user?.id || null;

    const item = await referencePointsService.updateReferencePoint(
      req.params.id,
      { description, status },
      userId
    );
    res.json(item);
  } catch (e) {
    console.error(e);
    if (e instanceof AppError) {
      return sendErrorResponse(res, { status: e.status, message: e.message, code: e.code });
    }
    sendErrorResponse(res, e, 500, 'Error al actualizar punto de referencia');
  }
}

async function remove(req, res) {
  try {
    const userId = req.user?.id || null;
    const item = await referencePointsService.deleteReferencePoint(req.params.id, userId);
    res.json({ message: 'Punto de referencia desactivado correctamente', item });
  } catch (e) {
    console.error(e);
    if (e instanceof AppError) {
      return sendErrorResponse(res, { status: e.status, message: e.message, code: e.code });
    }
    sendErrorResponse(res, e, 500, 'Error al desactivar punto de referencia');
  }
}

module.exports = { list, select, getById, create, update, remove };
