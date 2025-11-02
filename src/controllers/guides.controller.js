const guidesService = require('../services/guides.service');

/**
 * GET /api/guides/availability?date=YYYY-MM-DD&activityTypeId=&languageIds=uuid,uuid
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
 * POST /api/guides
 * body: { fullName, email, phone?, isLeader?, status?, maxPartySize? }
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
 * POST /api/guides/:id/languages
 * body: { languageIds: [uuid, uuid] }
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

module.exports = { availability, list, create, setLanguages };