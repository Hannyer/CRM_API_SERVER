// src/routes/booking-assignments.routes.js
const { Router } = require('express');
const ctrl = require('../controllers/booking-assignments.controller');
const calendarCtrl = require('../controllers/calendar.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');
const { requireCrmEntitlement } = require('../middlewares/subscription.middleware');

const router = Router();

router.use(verifyToken);

const operatorEntitlement = requireCrmEntitlement('operator');
const guideAssignmentsEntitlement = requireCrmEntitlement('my-guide-assignments');
const driverAssignmentsEntitlement = requireCrmEntitlement('my-driver-assignments');

// Obtener guías disponibles para asignar
router.get('/guides/available', operatorEntitlement, requirePermission('operator'), ctrl.getAvailableGuides);
router.get('/drivers/available', operatorEntitlement, requirePermission('operator'), ctrl.getAvailableDrivers);

// Módulos personales para guías y conductores
router.get('/me/guide', guideAssignmentsEntitlement, ctrl.listMyGuideAssignments);
router.get('/me/guide/schedules/:activityScheduleId/bookings', guideAssignmentsEntitlement, ctrl.listMyGuideScheduleBookings);
router.get('/me/guide/calendar-token', guideAssignmentsEntitlement, calendarCtrl.getMyCalendarToken);
router.post('/me/guide/calendar-token/regenerate', guideAssignmentsEntitlement, calendarCtrl.regenerateMyCalendarToken);
router.get('/me/driver', driverAssignmentsEntitlement, ctrl.listMyDriverAssignments);
router.get('/me/driver/calendar-token', driverAssignmentsEntitlement, calendarCtrl.getMyDriverCalendarToken);
router.post('/me/driver/calendar-token/regenerate', driverAssignmentsEntitlement, calendarCtrl.regenerateMyDriverCalendarToken);

// Submódulo de salidas con guías asignados
router.get('/schedules/guides', operatorEntitlement, requirePermission('operator'), ctrl.listScheduleGuideAssignments);
router.get('/schedules/:activityScheduleId/guides/available', operatorEntitlement, requirePermission('operator'), ctrl.getAvailableGuidesBySchedule);
router.put('/schedules/:activityScheduleId/guides', operatorEntitlement, requirePermission('operator'), ctrl.assignScheduleGuides);

// Submódulo de reservaciones con transporte asignado
router.get('/transports/assigned', operatorEntitlement, requirePermission('operator'), ctrl.listBookingTransportAssignments);

// Obtener asignaciones actuales de una reserva
router.get('/:bookingId', operatorEntitlement, requirePermission('operator'), ctrl.getAssignments);

// Los guías se asignan por salida/actividad programada, no por reservación.
router.put('/:bookingId/guides', operatorEntitlement, requirePermission('operator'), (_req, res) => {
  res.status(410).json({
    message: 'Los guías se asignan por salida en /api/booking-assignments/schedules/:activityScheduleId/guides',
  });
});

// Asignar transporte a una reserva
router.put('/:bookingId/transport', operatorEntitlement, requirePermission('operator'), ctrl.assignTransport);

// Confirmar una reserva (cambiar status a 'confirmed')
router.put('/:bookingId/confirm', operatorEntitlement, requirePermission('operator'), ctrl.confirmBooking);

module.exports = router;
