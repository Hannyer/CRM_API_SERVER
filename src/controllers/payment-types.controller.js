const paymentTypesService = require('../services/payment-types.service');
const { sendErrorResponse } = require('../utils/errorHandler');

/**
 * @openapi
 * /api/payment-types:
 *   get:
 *     tags: [PaymentTypes]
 *     summary: Listar tipos de pago
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

    const data = await paymentTypesService.listPaymentTypes({ page, limit, status });
    res.json({ items: data.items, pagination: { page: data.page, limit: data.limit, total: data.total, totalPages: data.totalPages } });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al listar tipos de pago');
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const item = await paymentTypesService.getPaymentTypeById(id);
    if (!item) return sendErrorResponse(res, { status: 404, message: 'Tipo de pago no encontrado' });
    res.json(item);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener tipo de pago');
  }
}

async function create(req, res) {
  try {
    const { name, status = true } = req.body || {};
    if (!name) return sendErrorResponse(res, { status: 400, message: 'name es requerido' });
    const item = await paymentTypesService.createPaymentType({ name, status });
    res.status(201).json(item);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al crear tipo de pago');
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { name, status } = req.body || {};
    const item = await paymentTypesService.updatePaymentType(id, { name, status });
    if (!item) return sendErrorResponse(res, { status: 404, message: 'Tipo de pago no encontrado' });
    res.json(item);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al actualizar tipo de pago');
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const item = await paymentTypesService.deletePaymentType(id);
    if (!item) return sendErrorResponse(res, { status: 404, message: 'Tipo de pago no encontrado' });
    res.json({ message: 'Tipo de pago eliminado correctamente', item });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al eliminar tipo de pago');
  }
}

module.exports = { list, getById, create, update, remove };

