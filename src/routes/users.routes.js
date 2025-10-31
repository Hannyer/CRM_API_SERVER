﻿const { Router } = require('express');
const usersController = require('../controllers/users.controller');

const router = Router();
router.get('/', usersController.list);
router.post('/', usersController.create);

module.exports = router;
