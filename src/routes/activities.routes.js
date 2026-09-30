const { Router } = require('express');
const ctrl = require('../controllers/activities.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');
const { requireCrmEntitlement } = require('../middlewares/subscription.middleware');

const router = Router();

router.use(verifyToken);

const activitiesEntitlement = requireCrmEntitlement('activities');
const schedulesEntitlement = requireCrmEntitlement('schedules');

// Rutas para actividades
router.get('/by-date', activitiesEntitlement, requirePermission('activities'), ctrl.getByDate);
router.get('/', activitiesEntitlement, requirePermission('activities'), ctrl.list);
router.get('/:id', activitiesEntitlement, requirePermission('activities'), ctrl.getById);
router.post('/', activitiesEntitlement, requirePermission('activities'), ctrl.create);
router.put('/:id', activitiesEntitlement, requirePermission('activities'), ctrl.update);
router.put('/:id/toggle-status', activitiesEntitlement, requirePermission('activities'), ctrl.toggleStatus);
router.put('/:id/assignments', activitiesEntitlement, requirePermission('activities'), ctrl.replaceAssignments);
router.delete('/:id', activitiesEntitlement, requirePermission('activities'), ctrl.remove);

// Rutas para planeaciones (schedules)
router.get('/:activityId/schedules', schedulesEntitlement, requirePermission('schedules'), ctrl.getSchedules);
router.post('/:activityId/schedules', schedulesEntitlement, requirePermission('schedules'), ctrl.createSchedule);
// Rutas específicas deben ir antes de las genéricas
router.post('/:activityId/schedules/bulk', schedulesEntitlement, requirePermission('schedules'), ctrl.bulkCreateSchedules);
router.get('/:activityId/schedules/available', schedulesEntitlement, requirePermission('schedules'), ctrl.getAvailableSchedulesByDate);
// Ruta para consultar disponibilidad
router.get('/schedules/availability', schedulesEntitlement, requirePermission('schedules'), ctrl.getScheduleAvailability);

// Rutas genéricas (IDs) deben ir después de las específicas
router.get('/schedules/:scheduleId', schedulesEntitlement, requirePermission('schedules'), ctrl.getScheduleById);
router.put('/schedules/:scheduleId', schedulesEntitlement, requirePermission('schedules'), ctrl.updateSchedule);
router.put('/schedules/:scheduleId/toggle-status', schedulesEntitlement, requirePermission('schedules'), ctrl.toggleScheduleStatus);
router.delete('/schedules/:scheduleId', schedulesEntitlement, requirePermission('schedules'), ctrl.deleteSchedule);
// Ruta para agregar asistentes
router.post('/schedules/:scheduleId/attendees', schedulesEntitlement, requirePermission('schedules'), ctrl.addAttendeesToSchedule);

module.exports = router;
