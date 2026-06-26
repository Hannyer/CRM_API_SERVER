const { Router } = require('express');
const ctrl = require('../controllers/bookings.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verifyToken);

// Rutas para obtener información de disponibilidad
router.get('/activities/:activityId/schedules', requirePermission('bookings'), ctrl.getAvailableSchedules);
router.get('/schedules/:scheduleId/availability', requirePermission('bookings'), ctrl.checkAvailability);
router.get('/configurations/:id', requirePermission('bookings'), ctrl.GetConfigurationsBookings);

// Rutas CRUD de reservas
router.get('/', requirePermission('bookings'), ctrl.list);
router.get('/:id', requirePermission('bookings'), ctrl.getById);
router.post('/', requirePermission('bookings'), ctrl.create);
router.put('/:id', requirePermission('bookings'), ctrl.update);
router.put('/:id/cancel', requirePermission('bookings'), ctrl.cancel);

module.exports = router;

