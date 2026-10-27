// src/routes/activity-types.routes.js
const { Router } = require('express');
const ctrl = require('../controllers/activity-types.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');
const { requireCrmEntitlement } = require('../middlewares/subscription.middleware');

const router = Router();

// Todas las rutas de este modulo requieren sesion iniciada.
router.use(verifyToken);
router.use(requireCrmEntitlement('activity-types'));

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', requirePermission('activities'), ctrl.create);
router.put('/:id', requirePermission('activities'), ctrl.update);
router.delete('/:id', requirePermission('activities'), ctrl.remove);

module.exports = router;

