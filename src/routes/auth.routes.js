const { Router } = require('express');
const { login, requestPasswordReset, resetPassword } = require('../controllers/auth.controller');

const { rateLimit } = require('../middlewares/rate-limit.middleware');
const router = Router();
const authIp = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, identity: true });
const recoveryLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 3, identity: true });
router.use(authIp);

router.post('/login', loginLimit, login);
router.post('/forgot-password', recoveryLimit, requestPasswordReset);
router.post('/reset-password', loginLimit, resetPassword);

module.exports = router;
