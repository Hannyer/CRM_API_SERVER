const cardTypesService = require('../services/card-types.service');
const { sendErrorResponse } = require('../utils/errorHandler');

/**
 * @openapi
 * /api/card-types:
 *   get:
 *     tags: [CardTypes]
 *     summary: Listar tipos de tarjeta
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
 *     responses:
 *       200: { description: Lista paginada }
 */
async function list(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const status = req.query.status !== undefined ? req.query.status === 'true' : null;

    const data = await cardTypesService.listCardTypes({ page, limit, status });
    res.json({ items: data.items, pagination: { page: data.page, limit: data.limit, total: data.total, totalPages: data.totalPages } });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al listar tipos de tarjeta');
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const item = await cardTypesService.getCardTypeById(id);
    if (!item) return sendErrorResponse(res, { status: 404, message: 'Tipo de tarjeta no encontrado' });
    res.json(item);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener tipo de tarjeta');
  }
}

async function create(req, res) {
  try {
    const { name, status = true } = req.body || {};
    if (!name) return sendErrorResponse(res, { status: 400, message: 'name es requerido' });
    const item = await cardTypesService.createCardType({ name, status });
    res.status(201).json(item);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al crear tipo de tarjeta');
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { name, status } = req.body || {};
    const item = await cardTypesService.updateCardType(id, { name, status });
    if (!item) return sendErrorResponse(res, { status: 404, message: 'Tipo de tarjeta no encontrado' });
    res.json(item);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al actualizar tipo de tarjeta');
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const item = await cardTypesService.deleteCardType(id);
    if (!item) return sendErrorResponse(res, { status: 404, message: 'Tipo de tarjeta no encontrado' });
    res.json({ message: 'Tipo de tarjeta eliminado correctamente', item });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al eliminar tipo de tarjeta');
  }
}

module.exports = { list, getById, create, update, remove };

