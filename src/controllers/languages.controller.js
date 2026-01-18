const languagesService = require('../services/languages.service');
const { AppError } = require('../utils/AppError');
const { sendErrorResponse } = require('../utils/errorHandler');

/**
 * @openapi
 * /api/languages:
 *   get:
 *     tags: [Languages]
 *     summary: Listar todos los idiomas
 *     description: Obtiene una lista paginada de todos los idiomas registrados en el sistema
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
 *         description: Lista paginada de idiomas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LanguageListItem'
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
    
    const data = await languagesService.listLanguages({ page, limit });
    
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
    sendErrorResponse(res, e, 500, 'Error al listar idiomas');
  }
}

/**
 * @openapi
 * /api/languages/{id}:
 *   get:
 *     tags: [Languages]
 *     summary: Obtener un idioma por ID
 *     description: Obtiene la información completa de un idioma
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del idioma
 *     responses:
 *       200:
 *         description: Información del idioma
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Language'
 *       404:
 *         description: Idioma no encontrado
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
    const language = await languagesService.getLanguageById(id);
    
    if (!language) {
      return sendErrorResponse(res, { status: 404, message: 'Idioma no encontrado' });
    }
    
    res.json(language);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener idioma');
  }
}

/**
 * @openapi
 * /api/languages:
 *   post:
 *     tags: [Languages]
 *     summary: Crear un nuevo idioma
 *     description: Crea un nuevo idioma en el sistema
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LanguageCreateRequest'
 *     responses:
 *       201:
 *         description: Idioma creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Language'
 *       400:
 *         description: Datos inválidos (code y name son requeridos)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Ya existe un idioma con ese código
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
    const { code, name, status = true } = req.body || {};
    if (!code || !name) {
      return sendErrorResponse(res, { status: 400, message: 'code y name son requeridos' });
    }

    const language = await languagesService.createLanguage({ code, name, status });
    res.status(201).json(language);
  } catch (e) {
    console.error(e);
    // conflicto por código único
    if (String(e.message).toLowerCase().includes('unique')) {
      return sendErrorResponse(res, { status: 409, message: 'Ya existe un idioma con ese código' });
    }
    sendErrorResponse(res, e, 500, 'Error al crear idioma');
  }
}

/**
 * @openapi
 * /api/languages/{id}:
 *   put:
 *     tags: [Languages]
 *     summary: Actualizar un idioma
 *     description: Actualiza la información de un idioma existente. Solo se actualizan los campos proporcionados.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del idioma
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LanguageUpdateRequest'
 *     responses:
 *       200:
 *         description: Idioma actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Language'
 *       404:
 *         description: Idioma no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Ya existe un idioma con ese código
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
    const { code, name, status } = req.body || {};
    
    const language = await languagesService.updateLanguage(id, {
      code,
      name,
      status
    });
    
    if (!language) {
      return sendErrorResponse(res, { status: 404, message: 'Idioma no encontrado' });
    }
    
    res.json(language);
  } catch (e) {
    console.error(e);
    if (String(e.message).toLowerCase().includes('unique')) {
      return sendErrorResponse(res, { status: 409, message: 'Ya existe un idioma con ese código' });
    }
    sendErrorResponse(res, e, 500, 'Error al actualizar idioma');
  }
}

/**
 * @openapi
 * /api/languages/{id}:
 *   delete:
 *     tags: [Languages]
 *     summary: Eliminar un idioma
 *     description: Realiza un soft delete del idioma (cambia su status a false)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del idioma
 *     responses:
 *       200:
 *         description: Idioma eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Idioma eliminado correctamente
 *                 language:
 *                   $ref: '#/components/schemas/LanguageListItem'
 *       404:
 *         description: Idioma no encontrado
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
    const language = await languagesService.deleteLanguage(id);
    
    if (!language) {
      return sendErrorResponse(res, { status: 404, message: 'Idioma no encontrado' });
    }
    
    res.json({ message: 'Idioma eliminado correctamente', language });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al eliminar idioma');
  }
}

module.exports = { list, getById, create, update, remove };

