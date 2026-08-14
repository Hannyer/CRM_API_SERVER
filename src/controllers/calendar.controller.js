const calendarService = require('../services/calendar.service');
const { AppError } = require('../utils/AppError');
const { sendErrorResponse } = require('../utils/errorHandler');

/** Construye las URLs de suscripción (http y webcal) a partir de la petición. */
function buildFeedUrls(req, token, kind = 'guide') {
  const base = (process.env.PUBLIC_API_URL || '').replace(/\/+$/, '') ||
    `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}`;
  const feedUrl = `${base}/api/calendar/${kind}/${token}/feed.ics`;
  const webcalUrl = feedUrl.replace(/^https?:/, 'webcal:');
  return { feedUrl, webcalUrl };
}

/** GET /api/booking-assignments/me/guide/calendar-token (autenticado) */
async function getMyCalendarToken(req, res) {
  try {
    const token = await calendarService.getOrCreateToken(req.user.id);
    res.json({ token, ...buildFeedUrls(req, token) });
  } catch (e) {
    console.error(e);
    if (e instanceof AppError) return res.status(e.status).json({ message: e.message, code: e.code });
    sendErrorResponse(res, e, 500, 'Error al obtener el enlace de calendario');
  }
}

/** POST /api/booking-assignments/me/guide/calendar-token/regenerate (autenticado) */
async function regenerateMyCalendarToken(req, res) {
  try {
    const token = await calendarService.regenerateToken(req.user.id);
    res.json({ token, ...buildFeedUrls(req, token) });
  } catch (e) {
    console.error(e);
    if (e instanceof AppError) return res.status(e.status).json({ message: e.message, code: e.code });
    sendErrorResponse(res, e, 500, 'Error al regenerar el enlace de calendario');
  }
}

/** GET /api/calendar/guide/:token/feed.ics (público, sin login — lo consulta la app de calendario) */
async function getGuideFeed(req, res) {
  try {
    const { ics, filename } = await calendarService.buildGuideCalendarByToken(req.params.token);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, max-age=0');
    res.send(ics);
  } catch (e) {
    if (e instanceof AppError) return res.status(e.status).json({ message: e.message, code: e.code });
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al generar el calendario');
  }
}

/** GET /api/booking-assignments/me/driver/calendar-token (autenticado) */
async function getMyDriverCalendarToken(req, res) {
  try {
    const token = await calendarService.getOrCreateToken(req.user.id);
    res.json({ token, ...buildFeedUrls(req, token, 'driver') });
  } catch (e) {
    console.error(e);
    if (e instanceof AppError) return res.status(e.status).json({ message: e.message, code: e.code });
    sendErrorResponse(res, e, 500, 'Error al obtener el enlace de calendario');
  }
}

/** POST /api/booking-assignments/me/driver/calendar-token/regenerate (autenticado) */
async function regenerateMyDriverCalendarToken(req, res) {
  try {
    const token = await calendarService.regenerateToken(req.user.id);
    res.json({ token, ...buildFeedUrls(req, token, 'driver') });
  } catch (e) {
    console.error(e);
    if (e instanceof AppError) return res.status(e.status).json({ message: e.message, code: e.code });
    sendErrorResponse(res, e, 500, 'Error al regenerar el enlace de calendario');
  }
}

/** GET /api/calendar/driver/:token/feed.ics (público, sin login) */
async function getDriverFeed(req, res) {
  try {
    const { ics, filename } = await calendarService.buildDriverCalendarByToken(req.params.token);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, max-age=0');
    res.send(ics);
  } catch (e) {
    if (e instanceof AppError) return res.status(e.status).json({ message: e.message, code: e.code });
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al generar el calendario');
  }
}

module.exports = {
  getMyCalendarToken,
  regenerateMyCalendarToken,
  getGuideFeed,
  getMyDriverCalendarToken,
  regenerateMyDriverCalendarToken,
  getDriverFeed,
};
