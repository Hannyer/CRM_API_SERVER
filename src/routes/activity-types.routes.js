// src/routes/activity-types.routes.js
const { Router } = require('express');
const ctrl = require('../controllers/activity-types.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = Router();

// Todas las rutas de este modulo requieren sesion iniciada.
router.use(verifyToken);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;

