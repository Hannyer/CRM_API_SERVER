const { Router } = require('express');
const usersRoutes = require('./users.routes');
const authRoutes = require('./auth.routes');
const guidesRoutes = require('./guides.routes');
const languagesRoutes = require('./languages.routes');
const activitiesRoutes = require('./activities.routes');
const activityTypesRoutes = require('./activity-types.routes');
const transportRoutes = require('./transport.routes');
const configRoutes = require('./config.routes');
const companiesRoutes = require('./companies.routes');
const bookingsRoutes = require('./bookings.routes');

const router = Router();
 
router.use('/users', usersRoutes);
router.use('/auth', authRoutes);  
router.use('/guides', guidesRoutes);
router.use('/languages', languagesRoutes);
router.use('/activities', activitiesRoutes);
router.use('/activity-types', activityTypesRoutes);
router.use('/transport', transportRoutes);
router.use('/config', configRoutes);
router.use('/companies', companiesRoutes);
router.use('/bookings', bookingsRoutes);  


module.exports = router;
