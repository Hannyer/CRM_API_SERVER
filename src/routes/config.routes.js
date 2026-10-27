const { Router } = require('express');
const ctrl = require('../controllers/config.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');
const { requireCrmEntitlement } = require('../middlewares/subscription.middleware');

const router = Router();

// Todas las rutas de este modulo requieren sesion iniciada.
router.use(verifyToken);
router.use(requireCrmEntitlement('settings'));

router.get('/by-keys', ctrl.listByKeys);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', requirePermission('settings'), ctrl.create);
router.put('/:id', requirePermission('settings'), ctrl.update);
router.delete('/:id', requirePermission('settings'), ctrl.remove);

module.exports = router;

