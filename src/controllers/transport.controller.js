const transportService = require('../services/transport.service');
const { AppError } = require('../utils/AppError');
const { sendErrorResponse } = require('../utils/errorHandler');

/**
 * @openapi
 * /api/transport:
 *   get:
 *     tags: [Transport]
 *     summary: Listar todos los transportes
 *     description: Obtiene una lista paginada de todos los transportes registrados en el sistema
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
 *         description: Lista paginada de transportes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TransportListItem'
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
    
    const data = await transportService.listTransports({ page, limit });
    
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
    sendErrorResponse(res, e, 500, 'Error al listar transportes');
  }
}

/**
 * @openapi
 * /api/transport/available:
 *   get:
 *     tags: [Transport]
 *     summary: Listar transportes disponibles
 *     description: Obtiene una lista paginada de transportes disponibles (activos y en circulación)
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
 *         description: Lista paginada de transportes disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TransportListItem'
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
async function listAvailable(req, res) {
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
    
    const data = await transportService.getAvailableTransports({ page, limit });
    
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
    sendErrorResponse(res, e, 500, 'Error al listar transportes disponibles');
  }
}

/**
 * @openapi
 * /api/transport/{id}:
 *   get:
 *     tags: [Transport]
 *     summary: Obtener un transporte por ID
 *     description: Obtiene la información completa de un transporte
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del transporte
 *     responses:
 *       200:
 *         description: Información del transporte
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transport'
 *       404:
 *         description: Transporte no encontrado
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
    const transport = await transportService.getTransportById(id);
    
    if (!transport) {
      return sendErrorResponse(res, { status: 404, message: 'Transporte no encontrado' });
    }
    
    res.json(transport);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener transporte');
  }
}

/**
 * @openapi
 * /api/transport:
 *   post:
 *     tags: [Transport]
 *     summary: Crear un nuevo transporte
 *     description: Crea un nuevo transporte en el sistema
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransportCreateRequest'
 *     responses:
 *       201:
 *         description: Transporte creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transport'
 *       400:
 *         description: Datos inválidos (capacity y model son requeridos)
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
    const { capacity, model, operationalStatus = true, status = true } = req.body || {};
    if (!capacity || !model) {
      return sendErrorResponse(res, { status: 400, message: 'capacity y model son requeridos' });
    }

    if (typeof capacity !== 'number' || capacity < 1) {
      return sendErrorResponse(res, { status: 400, message: 'capacity debe ser un número mayor a 0' });
    }

    const transport = await transportService.createTransport({ capacity, model, operationalStatus, status });
    res.status(201).json(transport);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al crear transporte');
  }
}

/**
 * @openapi
 * /api/transport/{id}:
 *   put:
 *     tags: [Transport]
 *     summary: Actualizar un transporte
 *     description: Actualiza la información de un transporte existente. Solo se actualizan los campos proporcionados.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del transporte
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransportUpdateRequest'
 *     responses:
 *       200:
 *         description: Transporte actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transport'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Transporte no encontrado
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
    const { capacity, model, operationalStatus, status } = req.body || {};
    
    if (capacity !== undefined && (typeof capacity !== 'number' || capacity < 1)) {
      return sendErrorResponse(res, { status: 400, message: 'capacity debe ser un número mayor a 0' });
    }
    
    const transport = await transportService.updateTransport(id, {
      capacity,
      model,
      operationalStatus,
      status
    });
    
    if (!transport) {
      return sendErrorResponse(res, { status: 404, message: 'Transporte no encontrado' });
    }
    
    res.json(transport);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al actualizar transporte');
  }
}

/**
 * @openapi
 * /api/transport/{id}:
 *   delete:
 *     tags: [Transport]
 *     summary: Eliminar un transporte
 *     description: Realiza un soft delete del transporte (cambia su status a false)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del transporte
 *     responses:
 *       200:
 *         description: Transporte eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Transporte eliminado correctamente
 *                 transport:
 *                   $ref: '#/components/schemas/TransportListItem'
 *       404:
 *         description: Transporte no encontrado
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
    const transport = await transportService.deleteTransport(id);
    
    if (!transport) {
      return sendErrorResponse(res, { status: 404, message: 'Transporte no encontrado' });
    }
    
    res.json({ message: 'Transporte eliminado correctamente', transport });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al eliminar transporte');
  }
}

module.exports = { list, listAvailable, getById, create, update, remove };

