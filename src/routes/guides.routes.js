const { Router } = require('express');
const ctrl = require('../controllers/guides.controller');

const router = Router();

router.get('/availability', ctrl.availability);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/:id/languages', ctrl.setLanguages);

module.exports = router;
