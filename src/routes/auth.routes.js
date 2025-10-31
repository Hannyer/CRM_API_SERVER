const { Router } = require('express');
const { login } = require('../controllers/auth.controller');

const router = Router();

// Este endpoint será POST /login dentro del grupo /auth
router.post('/login', login);

module.exports = router;
