const { Router } = require('express');
const ctrl = require('../controllers/security.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');
const { requireCrmEntitlement } = require('../middlewares/subscription.middleware');

const router = Router();

// Todas las rutas de este modulo requieren sesion iniciada.
router.use(verifyToken);

router.get('/menu/:roleId', requireCrmEntitlement(), (req, res, next) => {
  if (req.params.roleId === req.user.roleId) return next();
  return requirePermission('security')(req, res, next);
}, ctrl.getDynamicMenu);
router.get('/roles/:roleId/permissions', requireCrmEntitlement('security'), requirePermission('security'), ctrl.getPermissionsByRole);
router.put('/roles/:roleId/permissions', requireCrmEntitlement('security'), requirePermission('security'), ctrl.savePermissionsByRole);

module.exports = router;
