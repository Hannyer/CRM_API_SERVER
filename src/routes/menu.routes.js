const { Router } = require('express');
const ctrl = require('../controllers/menu.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');
const { requireCrmEntitlement } = require('../middlewares/subscription.middleware');

const router = Router();

router.use(verifyToken);
router.use(requireCrmEntitlement('menu'));

router.get('/', requirePermission('menu'), ctrl.list);
router.post('/', requirePermission('menu'), ctrl.create);
router.put('/:id', requirePermission('menu'), ctrl.update);
router.delete('/:id', requirePermission('menu'), ctrl.remove);

module.exports = router;
