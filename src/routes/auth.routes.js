const { Router } = require('express');
const { login, requestPasswordReset, resetPassword } = require('../controllers/auth.controller');

const router = Router();

router.post('/login', login);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

module.exports = router;
