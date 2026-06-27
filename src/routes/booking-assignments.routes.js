// src/routes/booking-assignments.routes.js
const { Router } = require('express');
const ctrl = require('../controllers/booking-assignments.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verifyToken);

// Obtener guías disponibles para asignar
router.get('/guides/available', requirePermission('operator'), ctrl.getAvailableGuides);
router.get('/drivers/available', requirePermission('operator'), ctrl.getAvailableDrivers);

// Módulos personales para guías y conductores
router.get('/me/guide', ctrl.listMyGuideAssignments);
router.get('/me/driver', ctrl.listMyDriverAssignments);

// Submódulo de salidas con guías asignados
router.get('/schedules/guides', requirePermission('operator'), ctrl.listScheduleGuideAssignments);
router.get('/schedules/:activityScheduleId/guides/available', requirePermission('operator'), ctrl.getAvailableGuidesBySchedule);
router.put('/schedules/:activityScheduleId/guides', requirePermission('operator'), ctrl.assignScheduleGuides);

// Submódulo de reservaciones con transporte asignado
router.get('/transports/assigned', requirePermission('operator'), ctrl.listBookingTransportAssignments);

// Obtener asignaciones actuales de una reserva
router.get('/:bookingId', requirePermission('operator'), ctrl.getAssignments);

// Los guías se asignan por salida/actividad programada, no por reservación.
router.put('/:bookingId/guides', requirePermission('operator'), (_req, res) => {
  res.status(410).json({
    message: 'Los guías se asignan por salida en /api/booking-assignments/schedules/:activityScheduleId/guides',
  });
});

// Asignar transporte a una reserva
router.put('/:bookingId/transport', requirePermission('operator'), ctrl.assignTransport);

// Confirmar una reserva (cambiar status a 'confirmed')
router.put('/:bookingId/confirm', requirePermission('operator'), ctrl.confirmBooking);

module.exports = router;
