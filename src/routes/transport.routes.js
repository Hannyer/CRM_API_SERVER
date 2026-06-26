const { Router } = require('express');
const ctrl = require('../controllers/transport.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verifyToken);

router.get('/available', requirePermission('transports'), ctrl.listAvailable);
router.get('/', requirePermission('transports'), ctrl.list);
router.get('/:id', requirePermission('transports'), ctrl.getById);
router.post('/', requirePermission('transports'), ctrl.create);
router.put('/:id', requirePermission('transports'), ctrl.update);
router.delete('/:id', requirePermission('transports'), ctrl.remove);

module.exports = router;

