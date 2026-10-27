const { Router } = require('express');
const ctrl = require('../controllers/companies.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');
const { requireCrmEntitlement } = require('../middlewares/subscription.middleware');

const router = Router();

// Todas las rutas de este modulo requieren sesion iniciada.
router.use(verifyToken);
router.use(requireCrmEntitlement('companies'));

// Rutas para compañías
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', requirePermission('companies'), ctrl.create);
router.put('/:id', requirePermission('companies'), ctrl.update);
router.put('/:id/toggle-status', requirePermission('companies'), ctrl.toggleStatus);
router.delete('/:id', requirePermission('companies'), ctrl.remove);

module.exports = router;

