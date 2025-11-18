const { Router } = require('express');
const ctrl = require('../controllers/companies.controller');

const router = Router();

// Rutas para compañías
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.put('/:id/toggle-status', ctrl.toggleStatus);
router.delete('/:id', ctrl.remove);

module.exports = router;

