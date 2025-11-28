const { Router } = require('express');
const ctrl = require('../controllers/activities.controller');

const router = Router();

// Rutas para actividades
router.get('/by-date', ctrl.getByDate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.put('/:id/toggle-status', ctrl.toggleStatus);
router.put('/:id/assignments', ctrl.replaceAssignments);
router.delete('/:id', ctrl.remove);

// Rutas para planeaciones (schedules)
router.get('/:activityId/schedules', ctrl.getSchedules);
router.post('/:activityId/schedules', ctrl.createSchedule);
// Rutas específicas deben ir antes de las genéricas
router.post('/:activityId/schedules/bulk', ctrl.bulkCreateSchedules);
router.get('/:activityId/schedules/available', ctrl.getAvailableSchedulesByDate);
router.get('/schedules/:scheduleId', ctrl.getScheduleById);
router.put('/schedules/:scheduleId', ctrl.updateSchedule);
router.put('/schedules/:scheduleId/toggle-status', ctrl.toggleScheduleStatus);
router.delete('/schedules/:scheduleId', ctrl.deleteSchedule);
// Ruta para agregar asistentes
router.post('/schedules/:scheduleId/attendees', ctrl.addAttendeesToSchedule);
// Ruta para consultar disponibilidad
router.get('/schedules/availability', ctrl.getScheduleAvailability);

module.exports = router;
