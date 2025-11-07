const configService = require('../services/config.service');
const { AppError } = require('../utils/AppError');
const { sendErrorResponse } = require('../utils/errorHandler');

/**
 * @openapi
 * /api/config:
 *   get:
 *     tags: [Configuration]
 *     summary: Listar todas las configuraciones
 *     description: Obtiene una lista paginada de todas las configuraciones registradas en el sistema
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página (por defecto 1)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Cantidad de registros por página (por defecto 10, máximo 100)
 *     responses:
 *       200:
 *         description: Lista paginada de configuraciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ConfigurationListItem'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       description: Página actual
 *                     limit:
 *                       type: integer
 *                       description: Cantidad de registros por página
 *                     total:
 *                       type: integer
 *                       description: Total de registros
 *                     totalPages:
 *                       type: integer
 *                       description: Total de páginas
 *       400:
 *         description: Parámetros de paginación inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function list(req, res) {
  try {
    // Parsear y validar parámetros de paginación
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    
    // Validaciones
    if (page < 1) {
      return sendErrorResponse(res, { status: 400, message: 'page debe ser mayor o igual a 1' });
    }
    if (limit < 1) {
      return sendErrorResponse(res, { status: 400, message: 'limit debe ser mayor o igual a 1' });
    }
    if (limit > 100) {
      return sendErrorResponse(res, { status: 400, message: 'limit no puede ser mayor a 100' });
    }
    
    const data = await configService.listConfigurations({ page, limit });
    
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
    sendErrorResponse(res, e, 500, 'Error al listar configuraciones');
  }
}

/**
 * @openapi
 * /api/config/{id}:
 *   get:
 *     tags: [Configuration]
 *     summary: Obtener una configuración por ID
 *     description: Obtiene la información completa de una configuración
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           format: int64
 *         description: ID de la configuración (PK_CONFIGURATION)
 *     responses:
 *       200:
 *         description: Información de la configuración
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Configuration'
 *       404:
 *         description: Configuración no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function getById(req, res) {
  try {
    const { id } = req.params;
    const pkConfiguration = parseInt(id, 10);
    
    if (isNaN(pkConfiguration)) {
      return sendErrorResponse(res, { status: 400, message: 'ID debe ser un número válido' });
    }
    
    const configuration = await configService.getConfigurationById(pkConfiguration);
    
    if (!configuration) {
      return sendErrorResponse(res, { status: 404, message: 'Configuración no encontrada' });
    }
    
    res.json(configuration);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener configuración');
  }
}

/**
 * @openapi
 * /api/config:
 *   post:
 *     tags: [Configuration]
 *     summary: Crear una nueva configuración
 *     description: Crea una nueva configuración en el sistema
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfigurationCreateRequest'
 *     responses:
 *       201:
 *         description: Configuración creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Configuration'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function create(req, res) {
  try {
    const { 
      estado, 
      description, 
      observacion, 
      key01, 
      key02, 
      key03, 
      key04, 
      key05, 
      key06, 
      value, 
      displayName 
    } = req.body || {};

    const configuration = await configService.createConfiguration({ 
      estado, 
      description, 
      observacion, 
      key01, 
      key02, 
      key03, 
      key04, 
      key05, 
      key06, 
      value, 
      displayName 
    });
    
    res.status(201).json(configuration);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al crear configuración');
  }
}

/**
 * @openapi
 * /api/config/{id}:
 *   put:
 *     tags: [Configuration]
 *     summary: Actualizar una configuración
 *     description: Actualiza la información de una configuración existente. Solo se actualizan los campos proporcionados.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           format: int64
 *         description: ID de la configuración (PK_CONFIGURATION)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfigurationUpdateRequest'
 *     responses:
 *       200:
 *         description: Configuración actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Configuration'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Configuración no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const pkConfiguration = parseInt(id, 10);
    
    if (isNaN(pkConfiguration)) {
      return sendErrorResponse(res, { status: 400, message: 'ID debe ser un número válido' });
    }
    
    const { 
      estado, 
      description, 
      observacion, 
      key01, 
      key02, 
      key03, 
      key04, 
      key05, 
      key06, 
      value, 
      displayName 
    } = req.body || {};
    
    const configuration = await configService.updateConfiguration(pkConfiguration, {
      estado, 
      description, 
      observacion, 
      key01, 
      key02, 
      key03, 
      key04, 
      key05, 
      key06, 
      value, 
      displayName 
    });
    
    if (!configuration) {
      return sendErrorResponse(res, { status: 404, message: 'Configuración no encontrada' });
    }
    
    res.json(configuration);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al actualizar configuración');
  }
}

/**
 * @openapi
 * /api/config/{id}:
 *   delete:
 *     tags: [Configuration]
 *     summary: Eliminar una configuración
 *     description: Realiza un soft delete de la configuración (cambia su estado a 0)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           format: int64
 *         description: ID de la configuración (PK_CONFIGURATION)
 *     responses:
 *       200:
 *         description: Configuración eliminada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Configuración eliminada correctamente
 *                 configuration:
 *                   $ref: '#/components/schemas/ConfigurationListItem'
 *       404:
 *         description: Configuración no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function remove(req, res) {
  try {
    const { id } = req.params;
    const pkConfiguration = parseInt(id, 10);
    
    if (isNaN(pkConfiguration)) {
      return sendErrorResponse(res, { status: 400, message: 'ID debe ser un número válido' });
    }
    
    const configuration = await configService.deleteConfiguration(pkConfiguration);
    
    if (!configuration) {
      return sendErrorResponse(res, { status: 404, message: 'Configuración no encontrada' });
    }
    
    res.json({ message: 'Configuración eliminada correctamente', configuration });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al eliminar configuración');
  }
}

module.exports = { list, getById, create, update, remove };

