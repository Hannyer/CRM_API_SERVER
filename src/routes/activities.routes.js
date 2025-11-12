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
router.get('/schedules/:scheduleId', ctrl.getScheduleById);
router.put('/schedules/:scheduleId', ctrl.updateSchedule);
router.put('/schedules/:scheduleId/toggle-status', ctrl.toggleScheduleStatus);
router.delete('/schedules/:scheduleId', ctrl.deleteSchedule);

module.exports = router;
