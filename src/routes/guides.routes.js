const { Router } = require('express');
const ctrl = require('../controllers/guides.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verifyToken);

router.get('/availability', requirePermission('guides'), ctrl.availability);
router.get('/', requirePermission('guides'), ctrl.list);
router.get('/:id', requirePermission('guides'), ctrl.getById);
router.post('/', requirePermission('guides'), ctrl.create);
router.put('/:id', requirePermission('guides'), ctrl.update);
router.delete('/:id', requirePermission('guides'), ctrl.remove);
router.post('/:id/languages', requirePermission('guides'), ctrl.setLanguages);

module.exports = router;
