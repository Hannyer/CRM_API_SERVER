const { Router } = require('express');
const ctrl = require('../controllers/reference-points.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');

const router = Router();
const MENU_CODE = 'reference-points';

router.use(verifyToken);

router.get('/', requirePermission(MENU_CODE), ctrl.list);
router.get('/:id', requirePermission(MENU_CODE), ctrl.getById);
router.post('/', requirePermission(MENU_CODE), ctrl.create);
router.put('/:id', requirePermission(MENU_CODE), ctrl.update);
router.delete('/:id', requirePermission(MENU_CODE), ctrl.remove);

module.exports = router;
