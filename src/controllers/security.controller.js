const securityService = require('../services/security.service');
const { sendErrorResponse } = require('../utils/errorHandler');

/**
 * @openapi
 * /api/security/roles/{roleId}/permissions:
 *   get:
 *     tags: [Security]
 *     summary: Matriz de permisos por rol (Read / Write / Delete)
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Módulos con permisos del rol
 */
async function getPermissionsByRole(req, res) {
  try {
    const data = await securityService.getPermissionsByRoleId(req.params.roleId);
    res.json(data);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, e.status || 500, 'Error al obtener permisos');
  }
}

/**
 * @openapi
 * /api/security/roles/{roleId}/permissions:
 *   put:
 *     tags: [Security]
 *     summary: Guardar permisos del rol (checkboxes Read/Write/Delete)
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menuId: { type: string, format: uuid }
 *                     canRead: { type: boolean }
 *                     canWrite: { type: boolean }
 *                     canDelete: { type: boolean }
 *     responses:
 *       200:
 *         description: Permisos actualizados
 */
async function savePermissionsByRole(req, res) {
  try {
    const { permissions } = req.body || {};
    const data = await securityService.savePermissionsForRole(
      req.params.roleId,
      permissions
    );
    res.json(data);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, e.status || 500, 'Error al guardar permisos');
  }
}

/**
 * @openapi
 * /api/security/menu/{roleId}:
 *   get:
 *     tags: [Security]
 *     summary: Menú dinámico para el rol (solo módulos con canRead)
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Menú filtrado por permisos
 */
async function getDynamicMenu(req, res) {
  try {
    const data = await securityService.getDynamicMenuForRole(req.params.roleId);
    res.json(data);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, e.status || 500, 'Error al obtener menú dinámico');
  }
}

module.exports = {
  getPermissionsByRole,
  savePermissionsByRole,
  getDynamicMenu,
};
