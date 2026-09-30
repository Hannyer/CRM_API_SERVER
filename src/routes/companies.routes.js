const { Router } = require('express');
const ctrl = require('../controllers/companies.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireCrmEntitlement } = require('../middlewares/subscription.middleware');

const router = Router();

// Todas las rutas de este modulo requieren sesion iniciada.
router.use(verifyToken);
router.use(requireCrmEntitlement('companies'));

// Rutas para compañías
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.put('/:id/toggle-status', ctrl.toggleStatus);
router.delete('/:id', ctrl.remove);

module.exports = router;

