const { Router } = require('express');
const usersRoutes = require('./users.routes');
const authRoutes = require('./auth.routes');
const guidesRoutes = require('./guides.routes');
const activitiesRoutes = require('./activities.routes');
const transportRoutes = require('./transport.routes');
const configRoutes = require('./config.routes');

const router = Router();
 
router.use('/users', usersRoutes);
router.use('/auth', authRoutes);  
router.use('/guides', guidesRoutes);
router.use('/activities', activitiesRoutes);
router.use('/transport', transportRoutes);
router.use('/config', configRoutes);  


module.exports = router;
