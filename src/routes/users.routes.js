const { Router } = require('express');
const ctrl = require('../controllers/users.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verifyToken);

router.get('/', requirePermission('users'), ctrl.list);
router.get('/:id', requirePermission('users'), ctrl.getById);
router.post('/', requirePermission('users'), ctrl.create);
router.put('/:id', requirePermission('users'), ctrl.update);
router.delete('/:id', requirePermission('users'), ctrl.remove);

module.exports = router;
