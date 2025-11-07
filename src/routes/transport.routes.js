const { Router } = require('express');
const ctrl = require('../controllers/transport.controller');

const router = Router();

router.get('/available', ctrl.listAvailable);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;

