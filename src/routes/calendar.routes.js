// src/routes/calendar.routes.js
// Feed público de calendario (.ics). NO lleva verifyToken: lo consulta
// directamente la app de calendario del celular (Google/Apple/Outlook),
// que no puede enviar el JWT. La autenticación es por el token secreto en la URL.
const { Router } = require('express');
const ctrl = require('../controllers/calendar.controller');

const router = Router();

router.get('/guide/:token/feed.ics', ctrl.getGuideFeed);
router.get('/driver/:token/feed.ics', ctrl.getDriverFeed);

module.exports = router;
