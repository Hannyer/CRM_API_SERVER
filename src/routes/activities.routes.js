const { Router } = require('express');
const ctrl = require('../controllers/activities.controller');

const router = Router();

router.get('/by-date', ctrl.getByDate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.put('/:id/assignments', ctrl.replaceAssignments);
router.delete('/:id', ctrl.remove);

module.exports = router;
