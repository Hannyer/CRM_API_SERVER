const securityService = require('../services/security.service');
const { sendErrorResponse } = require('../utils/errorHandler');

/**
 * @openapi
 * /api/menu:
 *   get:
 *     tags: [Security]
 *     summary: Listar catálogo de módulos/menú
 *     responses:
 *       200:
 *         description: Lista de ítems de menú
 */
async function list(req, res) {
  try {
    const status =
      req.query.status === 'true' ? true : req.query.status === 'false' ? false : null;
    const items = await securityService.listMenus({ status });
    res.json(items);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al listar menú');
  }
}

/**
 * @openapi
 * /api/menu:
 *   post:
 *     tags: [Security]
 *     summary: Crear ítem de menú
 */
async function create(req, res) {
  try {
    const item = await securityService.createMenu(req.body || {});
    res.status(201).json(item);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, e.status || 500, 'Error al crear menú');
  }
}

/**
 * @openapi
 * /api/menu/{id}:
 *   put:
 *     tags: [Security]
 *     summary: Actualizar ítem de menú
 */
async function update(req, res) {
  try {
    const item = await securityService.updateMenu(req.params.id, req.body || {});
    if (!item) return sendErrorResponse(res, { status: 404, message: 'Menú no encontrado' });
    res.json(item);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, e.status || 500, 'Error al actualizar menú');
  }
}

/**
 * @openapi
 * /api/menu/{id}:
 *   delete:
 *     tags: [Security]
 *     summary: Desactivar ítem de menú
 */
async function remove(req, res) {
  try {
    const item = await securityService.deleteMenu(req.params.id);
    if (!item) return sendErrorResponse(res, { status: 404, message: 'Menú no encontrado' });
    res.json({ message: 'Menú desactivado', id: item.id });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, e.status || 500, 'Error al desactivar menú');
  }
}

module.exports = { list, create, update, remove };
