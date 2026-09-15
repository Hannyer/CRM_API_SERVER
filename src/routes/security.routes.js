const { Router } = require('express');
const ctrl = require('../controllers/security.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = Router();

// Todas las rutas de este modulo requieren sesion iniciada.
router.use(verifyToken);

router.get('/menu/:roleId', ctrl.getDynamicMenu);
router.get('/roles/:roleId/permissions', ctrl.getPermissionsByRole);
router.put('/roles/:roleId/permissions', ctrl.savePermissionsByRole);

module.exports = router;
