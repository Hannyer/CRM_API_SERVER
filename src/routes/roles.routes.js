const { Router } = require('express');
const ctrl = require('../controllers/roles.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verifyToken);

router.get('/select', requirePermission('roles'), ctrl.listForSelect);
router.get('/', requirePermission('roles'), ctrl.list);
router.get('/:id', requirePermission('roles'), ctrl.getById);
router.post('/', requirePermission('roles'), ctrl.create);
router.put('/:id', requirePermission('roles'), ctrl.update);
router.delete('/:id', requirePermission('roles'), ctrl.remove);

module.exports = router;
