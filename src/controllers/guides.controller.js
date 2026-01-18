const guidesService = require('../services/guides.service');
const { AppError } = require('../utils/AppError');
const { sendErrorResponse } = require('../utils/errorHandler');

/**
 * @openapi
 * /api/guides/availability:
 *   get:
 *     tags: [Guides]
 *     summary: Consultar disponibilidad de guías
 *     description: Obtiene la lista de guías disponibles para una fecha específica, opcionalmente filtrada por tipo de actividad e idiomas
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: '2024-12-25'
 *         description: Fecha en formato YYYY-MM-DD
 *       - in: query
 *         name: activityTypeId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del tipo de actividad (opcional)
 *       - in: query
 *         name: languageIds
 *         required: false
 *         schema:
 *           type: string
 *         description: IDs de idiomas separados por coma (opcional)
 *         example: '123e4567-e89b-12d3-a456-426614174000,223e4567-e89b-12d3-a456-426614174001'
 *     responses:
 *       200:
 *         description: Lista de guías disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GuideAvailabilityItem'
 *       400:
 *         description: Parámetro date es requerido
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
async function availability(req, res) {
  try {
    const { date, activityTypeId, languageIds } = req.query;
    if (!date) {
      return sendErrorResponse(res, { status: 400, message: 'date es requerido (YYYY-MM-DD)' });
    }

    const langs = typeof languageIds === 'string' && languageIds.length
      ? languageIds.split(',').map(s => s.trim())
      : [];

    const data = await guidesService.getAvailability({
      date, activityTypeId: activityTypeId || null, languageIds: langs
    });
    res.json(data);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al consultar disponibilidad');
  }
}
/**
 * @openapi
 * /api/guides:
 *   get:
 *     tags: [Guides]
 *     summary: Listar todos los guías
 *     description: Obtiene una lista paginada de todos los guías registrados en el sistema
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
 *         description: Lista paginada de guías
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GuideListItem'
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
    
    const data = await guidesService.listGuides({ page, limit });
    
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
    sendErrorResponse(res, e, 500, 'Error al listar guías');
  }
}

/**
 * @openapi
 * /api/guides/{id}:
 *   get:
 *     tags: [Guides]
 *     summary: Obtener un guía por ID
 *     description: Obtiene la información completa de un guía incluyendo sus idiomas asignados
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del guía
 *     responses:
 *       200:
 *         description: Información del guía
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Guide'
 *       404:
 *         description: Guía no encontrado
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
    const guide = await guidesService.getGuideById(id);
    
    if (!guide) {
      return sendErrorResponse(res, { status: 404, message: 'Guía no encontrado' });
    }
    
    res.json(guide);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener guía');
  }
}

/**
 * @openapi
 * /api/guides:
 *   post:
 *     tags: [Guides]
 *     summary: Crear un nuevo guía
 *     description: Crea un nuevo guía en el sistema
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GuideCreateRequest'
 *           example:
 *             fullName: "Juan Pérez"
 *             email: "juan.perez@example.com"
 *             phone: "+506 8888-8888"
 *             status: true
 *             languageIds: ["lang-uuid-1", "lang-uuid-2"]
 *     responses:
 *       201:
 *         description: Guía creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Guide'
 *       400:
 *         description: Datos inválidos (fullName y email son requeridos)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Ya existe un guía con ese email
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
    const { fullName, email, phone = null, status = true, languageIds = [] } = req.body || {};
    if (!fullName || !email) {
      return sendErrorResponse(res, { status: 400, message: 'fullName y email son requeridos' });
    }

    // Validar que languageIds sea un array si se proporciona
    if (languageIds !== undefined && !Array.isArray(languageIds)) {
      return sendErrorResponse(res, { status: 400, message: 'languageIds debe ser un arreglo de UUID' });
    }

    const guide = await guidesService.createGuide({ fullName, email, phone, status, languageIds });
    res.status(201).json(guide);
  } catch (e) {
    console.error(e);
    // conflicto por email único (si lo definiste)
    if (String(e.message).toLowerCase().includes('unique')) {
      return sendErrorResponse(res, { status: 409, message: 'Ya existe un guía con ese email' });
    }
    sendErrorResponse(res, e, 500, 'Error al crear guía');
  }
}

/**
 * @openapi
 * /api/guides/{id}:
 *   put:
 *     tags: [Guides]
 *     summary: Actualizar un guía
 *     description: Actualiza la información de un guía existente. Solo se actualizan los campos proporcionados.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del guía
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GuideUpdateRequest'
 *     responses:
 *       200:
 *         description: Guía actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Guide'
 *       404:
 *         description: Guía no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Ya existe un guía con ese email
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
    const { fullName, email, phone, status, languageIds } = req.body || {};
    
    // Validar que languageIds sea un array si se proporciona
    if (languageIds !== undefined && !Array.isArray(languageIds)) {
      return sendErrorResponse(res, { status: 400, message: 'languageIds debe ser un arreglo de UUID' });
    }
    
    const guide = await guidesService.updateGuide(id, {
      fullName,
      email,
      phone,
      status,
      languageIds
    });
    
    if (!guide) {
      return sendErrorResponse(res, { status: 404, message: 'Guía no encontrado' });
    }
    
    res.json(guide);
  } catch (e) {
    console.error(e);
    if (String(e.message).toLowerCase().includes('unique')) {
      return sendErrorResponse(res, { status: 409, message: 'Ya existe un guía con ese email' });
    }
    sendErrorResponse(res, e, 500, 'Error al actualizar guía');
  }
}

/**
 * @openapi
 * /api/guides/{id}:
 *   delete:
 *     tags: [Guides]
 *     summary: Eliminar un guía
 *     description: Realiza un soft delete del guía (cambia su status a false)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del guía
 *     responses:
 *       200:
 *         description: Guía eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Guía eliminado correctamente
 *                 guide:
 *                   $ref: '#/components/schemas/GuideListItem'
 *       404:
 *         description: Guía no encontrado
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
    const guide = await guidesService.deleteGuide(id);
    
    if (!guide) {
      return sendErrorResponse(res, { status: 404, message: 'Guía no encontrado' });
    }
    
    res.json({ message: 'Guía eliminado correctamente', guide });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al eliminar guía');
  }
}

/**
 * @openapi
 * /api/guides/{id}/languages:
 *   post:
 *     tags: [Guides]
 *     summary: Asignar idiomas a un guía
 *     description: Asigna o actualiza los idiomas que habla un guía. Reemplaza los idiomas existentes.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del guía
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GuideLanguagesRequest'
 *     responses:
 *       200:
 *         description: Idiomas asignados exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Guide'
 *       400:
 *         description: languageIds debe ser un arreglo de UUID
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
async function setLanguages(req, res) {
  try {
    const { id } = req.params;
    const { languageIds } = req.body || {};
    if (!Array.isArray(languageIds)) {
      return sendErrorResponse(res, { status: 400, message: 'languageIds debe ser un arreglo de UUID' });
    }
    const out = await guidesService.setGuideLanguages(id, languageIds);
    res.json(out);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al asignar idiomas al guía');
  }
}

module.exports = { availability, list, getById, create, update, remove, setLanguages };