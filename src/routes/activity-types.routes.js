// src/routes/activity-types.routes.js
const { Router } = require('express');
const ctrl = require('../controllers/activity-types.controller');

const router = Router();

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);

module.exports = router;

