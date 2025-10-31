const { Router } = require('express');
const usersRoutes = require('./users.routes');
const authRoutes = require('./auth.routes');
const router = Router();
router.use('/users', usersRoutes);
router.use('/auth', authRoutes);  

module.exports = router;
