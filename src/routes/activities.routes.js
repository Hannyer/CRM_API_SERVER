const { Router } = require('express');
const ctrl = require('../controllers/activities.controller');

const router = Router();

router.post('/', ctrl.create);
router.put('/:id/assignments', ctrl.replaceAssignments);

module.exports = router;
