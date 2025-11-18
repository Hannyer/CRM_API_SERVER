const companiesService = require('../services/companies.service');
const { AppError } = require('../utils/AppError');
const { sendErrorResponse } = require('../utils/errorHandler');

/**
 * @openapi
 * /api/companies:
 *   get:
 *     tags: [Companies]
 *     summary: Listar todas las compañías
 *     description: Obtiene una lista paginada de todas las compañías (socios) registradas en el sistema
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Cantidad de registros por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado (true = activas, false = inactivas, null = todas)
 *     responses:
 *       200:
 *         description: Lista paginada de compañías
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       commissionPercentage:
 *                         type: number
 *                         format: float
 *                       status:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: Parámetros inválidos
 *       500:
 *         description: Error interno del servidor
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
    
    const data = await companiesService.listCompanies({ page, limit, status });
    
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
    sendErrorResponse(res, e, 500, 'Error al listar compañías');
  }
}

/**
 * @openapi
 * /api/companies:
 *   post:
 *     tags: [Companies]
 *     summary: Crear compañía
 *     description: Crea una nueva compañía (socio) que puede traer clientes. La compañía tendrá un porcentaje de comisión parametrizado.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - commissionPercentage
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre de la compañía
 *                 example: "Tourismo ABC S.A."
 *               commissionPercentage:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Porcentaje de comisión que recibe la compañía (0-100)
 *                 example: 15.5
 *               status:
 *                 type: boolean
 *                 default: true
 *                 description: Estado inicial de la compañía
 *     responses:
 *       201:
 *         description: Compañía creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 commissionPercentage:
 *                   type: number
 *                   format: float
 *                 status:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Datos requeridos inválidos o faltantes
 *       500:
 *         description: Error interno del servidor
 */
async function create(req, res) {
  try {
    const payload = req.body || {};
    if (!payload.name || payload.commissionPercentage === undefined) {
      return res.status(400).json({ message: 'name y commissionPercentage son requeridos' });
    }

    if (payload.commissionPercentage < 0 || payload.commissionPercentage > 100) {
      return res.status(400).json({ message: 'commissionPercentage debe estar entre 0 y 100' });
    }

    const result = await companiesService.createCompany(payload);
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
    res.status(500).json({ message: 'Error al crear compañía: ' + e.message });
  }
}

/**
 * @openapi
 * /api/companies/{id}:
 *   get:
 *     tags: [Companies]
 *     summary: Obtener una compañía por ID
 *     description: Obtiene la información completa de una compañía por su identificador único
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único de la compañía
 *     responses:
 *       200:
 *         description: Información de la compañía
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 commissionPercentage:
 *                   type: number
 *                   format: float
 *                 status:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Compañía no encontrada
 *       500:
 *         description: Error interno del servidor
 */
async function getById(req, res) {
  try {
    const { id } = req.params;
    const company = await companiesService.getCompanyById(id);
    
    if (!company) {
      return sendErrorResponse(res, { status: 404, message: 'Compañía no encontrada' });
    }
    
    res.json(company);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener compañía');
  }
}

/**
 * @openapi
 * /api/companies/{id}:
 *   put:
 *     tags: [Companies]
 *     summary: Actualizar una compañía
 *     description: Actualiza la información de una compañía existente. Solo se actualizan los campos proporcionados.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único de la compañía
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre de la compañía
 *               commissionPercentage:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Porcentaje de comisión que recibe la compañía (0-100)
 *               status:
 *                 type: boolean
 *                 description: Estado de la compañía
 *     responses:
 *       200:
 *         description: Compañía actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 commissionPercentage:
 *                   type: number
 *                   format: float
 *                 status:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Compañía no encontrada
 *       500:
 *         description: Error interno del servidor
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const { name, commissionPercentage, status } = req.body || {};
    
    if (commissionPercentage !== undefined && (commissionPercentage < 0 || commissionPercentage > 100)) {
      return sendErrorResponse(res, { status: 400, message: 'commissionPercentage debe estar entre 0 y 100' });
    }
    
    const company = await companiesService.updateCompany(id, {
      name,
      commissionPercentage,
      status
    });
    
    if (!company) {
      return sendErrorResponse(res, { status: 404, message: 'Compañía no encontrada' });
    }
    
    res.json(company);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al actualizar compañía');
  }
}

/**
 * @openapi
 * /api/companies/{id}/toggle-status:
 *   put:
 *     tags: [Companies]
 *     summary: Activar o inactivar una compañía
 *     description: Cambia el estado de una compañía (activa/inactiva)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único de la compañía
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
 *                 description: Nuevo estado de la compañía (true = activa, false = inactiva)
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 commissionPercentage:
 *                   type: number
 *                   format: float
 *                 status:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: status debe ser un booleano
 *       404:
 *         description: Compañía no encontrada
 *       500:
 *         description: Error interno del servidor
 */
async function toggleStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    
    if (typeof status !== 'boolean') {
      return sendErrorResponse(res, { status: 400, message: 'status debe ser un booleano (true/false)' });
    }
    
    const company = await companiesService.toggleCompanyStatus(id, status);
    
    if (!company) {
      return sendErrorResponse(res, { status: 404, message: 'Compañía no encontrada' });
    }
    
    res.json(company);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al cambiar estado de compañía');
  }
}

/**
 * @openapi
 * /api/companies/{id}:
 *   delete:
 *     tags: [Companies]
 *     summary: Eliminar una compañía (soft delete)
 *     description: Inactiva una compañía cambiando su status a false. No se elimina físicamente de la base de datos.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único de la compañía
 *     responses:
 *       200:
 *         description: Compañía eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 company:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     status:
 *                       type: boolean
 *       404:
 *         description: Compañía no encontrada
 *       500:
 *         description: Error interno del servidor
 */
async function remove(req, res) {
  try {
    const { id } = req.params;
    const company = await companiesService.deleteCompany(id);
    
    if (!company) {
      return sendErrorResponse(res, { status: 404, message: 'Compañía no encontrada' });
    }
    
    res.json({ message: 'Compañía eliminada correctamente', company });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al eliminar compañía');
  }
}

module.exports = { 
  list, 
  getById, 
  create, 
  update, 
  toggleStatus,
  remove,
};

