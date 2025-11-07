const { Router } = require('express');
const ctrl = require('../controllers/guides.controller');

const router = Router();

router.get('/availability', ctrl.availability);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/languages', ctrl.setLanguages);

module.exports = router;
