const { Router } = require('express');
const ctrl = require('../controllers/security.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireCrmEntitlement } = require('../middlewares/subscription.middleware');

const router = Router();

// Todas las rutas de este modulo requieren sesion iniciada.
router.use(verifyToken);

router.get('/menu/:roleId', requireCrmEntitlement(), ctrl.getDynamicMenu);
router.get('/roles/:roleId/permissions', requireCrmEntitlement('security'), ctrl.getPermissionsByRole);
router.put('/roles/:roleId/permissions', requireCrmEntitlement('security'), ctrl.savePermissionsByRole);

module.exports = router;
