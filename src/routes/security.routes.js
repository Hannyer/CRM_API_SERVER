const { Router } = require('express');
const ctrl = require('../controllers/security.controller');

const router = Router();

router.get('/menu/:roleId', ctrl.getDynamicMenu);
router.get('/roles/:roleId/permissions', ctrl.getPermissionsByRole);
router.put('/roles/:roleId/permissions', ctrl.savePermissionsByRole);

module.exports = router;
