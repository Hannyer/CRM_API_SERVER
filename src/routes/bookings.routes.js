const { Router } = require('express');
const ctrl = require('../controllers/bookings.controller');

const router = Router();

// Rutas para obtener información de disponibilidad
router.get('/activities/:activityId/schedules', ctrl.getAvailableSchedules);
router.get('/schedules/:scheduleId/availability', ctrl.checkAvailability);
router.get('/configurations/:id', ctrl.GetConfigurationsBookings);

// Rutas CRUD de reservas
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.put('/:id/cancel', ctrl.cancel);

module.exports = router;

