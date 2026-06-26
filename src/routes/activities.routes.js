const { Router } = require('express');
const ctrl = require('../controllers/activities.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verifyToken);

// Rutas para actividades
router.get('/by-date', requirePermission('activities'), ctrl.getByDate);
router.get('/', requirePermission('activities'), ctrl.list);
router.get('/:id', requirePermission('activities'), ctrl.getById);
router.post('/', requirePermission('activities'), ctrl.create);
router.put('/:id', requirePermission('activities'), ctrl.update);
router.put('/:id/toggle-status', requirePermission('activities'), ctrl.toggleStatus);
router.put('/:id/assignments', requirePermission('activities'), ctrl.replaceAssignments);
router.delete('/:id', requirePermission('activities'), ctrl.remove);

// Rutas para planeaciones (schedules)
router.get('/:activityId/schedules', requirePermission('schedules'), ctrl.getSchedules);
router.post('/:activityId/schedules', requirePermission('schedules'), ctrl.createSchedule);
// Rutas específicas deben ir antes de las genéricas
router.post('/:activityId/schedules/bulk', requirePermission('schedules'), ctrl.bulkCreateSchedules);
router.get('/:activityId/schedules/available', requirePermission('schedules'), ctrl.getAvailableSchedulesByDate);
// Ruta para consultar disponibilidad
router.get('/schedules/availability', requirePermission('schedules'), ctrl.getScheduleAvailability);

// Rutas genéricas (IDs) deben ir después de las específicas
router.get('/schedules/:scheduleId', requirePermission('schedules'), ctrl.getScheduleById);
router.put('/schedules/:scheduleId', requirePermission('schedules'), ctrl.updateSchedule);
router.put('/schedules/:scheduleId/toggle-status', requirePermission('schedules'), ctrl.toggleScheduleStatus);
router.delete('/schedules/:scheduleId', requirePermission('schedules'), ctrl.deleteSchedule);
// Ruta para agregar asistentes
router.post('/schedules/:scheduleId/attendees', requirePermission('schedules'), ctrl.addAttendeesToSchedule);

module.exports = router;
