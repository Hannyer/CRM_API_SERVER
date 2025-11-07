const guidesService = require('../services/guides.service');
const { AppError } = require('../utils/AppError');

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
 *       500:
 *         description: Error interno del servidor
 */
async function availability(req, res) {
  try {
    const { date, activityTypeId, languageIds } = req.query;
    if (!date) return res.status(400).json({ message: 'date es requerido (YYYY-MM-DD)' });

    const langs = typeof languageIds === 'string' && languageIds.length
      ? languageIds.split(',').map(s => s.trim())
      : [];

    const data = await guidesService.getAvailability({
      date, activityTypeId: activityTypeId || null, languageIds: langs
    });
    res.json(data);
  } catch (e) {
    console.error(e);
     if (e instanceof AppError) {
      return res.status(e.status).json({
        message: e.message,
        code: e.code,
        details: e.details
      });
    }
    res.status(500).json({ message: 'Error al consultar disponibilidad '+e.message });
  }
}
/**
 * @openapi
 * /api/guides:
 *   get:
 *     tags: [Guides]
 *     summary: Listar todos los guías
 *     description: Obtiene una lista de todos los guías registrados en el sistema
 *     responses:
 *       200:
 *         description: Lista de guías
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GuideListItem'
 *       500:
 *         description: Error interno del servidor
 */
async function list(req, res) {
  try {
    const data = await guidesService.listGuides();
    res.json({ items: data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error al listar guías' });
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
 *       500:
 *         description: Error interno del servidor
 */
async function getById(req, res) {
  try {
    const { id } = req.params;
    const guide = await guidesService.getGuideById(id);
    
    if (!guide) {
      return res.status(404).json({ message: 'Guía no encontrado' });
    }
    
    res.json(guide);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error al obtener guía' });
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
 *     responses:
 *       201:
 *         description: Guía creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Guide'
 *       400:
 *         description: Datos inválidos (fullName y email son requeridos)
 *       409:
 *         description: Ya existe un guía con ese email
 *       500:
 *         description: Error interno del servidor
 */
async function create(req, res) {
  try {
    const { fullName, email, phone = null, isLeader = false, status = true, maxPartySize = null } = req.body || {};
    if (!fullName || !email) return res.status(400).json({ message: 'fullName y email son requeridos' });

    const guide = await guidesService.createGuide({ fullName, email, phone, isLeader, status, maxPartySize });
    res.status(201).json(guide);
  } catch (e) {
    console.error(e);
    // conflicto por email único (si lo definiste)
    if (String(e.message).toLowerCase().includes('unique')) {
      return res.status(409).json({ message: 'Ya existe un guía con ese email' });
    }
    res.status(500).json({ message: 'Error al crear guía' });
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
 *       409:
 *         description: Ya existe un guía con ese email
 *       500:
 *         description: Error interno del servidor
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const { fullName, email, phone, isLeader, status, maxPartySize } = req.body || {};
    
    const guide = await guidesService.updateGuide(id, {
      fullName,
      email,
      phone,
      isLeader,
      status,
      maxPartySize
    });
    
    if (!guide) {
      return res.status(404).json({ message: 'Guía no encontrado' });
    }
    
    res.json(guide);
  } catch (e) {
    console.error(e);
    if (String(e.message).toLowerCase().includes('unique')) {
      return res.status(409).json({ message: 'Ya existe un guía con ese email' });
    }
    res.status(500).json({ message: 'Error al actualizar guía' });
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
 *       500:
 *         description: Error interno del servidor
 */
async function remove(req, res) {
  try {
    const { id } = req.params;
    const guide = await guidesService.deleteGuide(id);
    
    if (!guide) {
      return res.status(404).json({ message: 'Guía no encontrado' });
    }
    
    res.json({ message: 'Guía eliminado correctamente', guide });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error al eliminar guía' });
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
 *       500:
 *         description: Error interno del servidor
 */
async function setLanguages(req, res) {
  try {
    const { id } = req.params;
    const { languageIds } = req.body || {};
    if (!Array.isArray(languageIds)) {
      return res.status(400).json({ message: 'languageIds debe ser un arreglo de UUID' });
    }
    const out = await guidesService.setGuideLanguages(id, languageIds);
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error al asignar idiomas al guía' });
  }
}

module.exports = { availability, list, getById, create, update, remove, setLanguages };