// src/routes/booking-assignments.routes.js
const { Router } = require('express');
const ctrl = require('../controllers/booking-assignments.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verifyToken);

// Obtener guías disponibles para asignar
router.get('/guides/available', requirePermission('operator'), ctrl.getAvailableGuides);

// Obtener asignaciones actuales de una reserva
router.get('/:bookingId', requirePermission('operator'), ctrl.getAssignments);

// Asignar guías a una reserva
router.put('/:bookingId/guides', requirePermission('operator'), ctrl.assignGuides);

// Asignar transporte a una reserva
router.put('/:bookingId/transport', requirePermission('operator'), ctrl.assignTransport);

// Confirmar una reserva (cambiar status a 'confirmed')
router.put('/:bookingId/confirm', requirePermission('operator'), ctrl.confirmBooking);

module.exports = router;

