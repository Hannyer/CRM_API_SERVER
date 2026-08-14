const { Router } = require('express');
const ctrl = require('../controllers/reports.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verifyToken);
router.use(requirePermission('bookings'));

router.get('/sales', ctrl.salesByPeriod);
router.get('/commissions', ctrl.commissionsByCompany);
router.get('/occupancy', ctrl.occupancyBySchedule);
router.get('/activities-ranking', ctrl.activityRanking);
router.get('/status', ctrl.bookingsByStatus);
router.get('/transport', ctrl.transportByDriver);
router.get('/guides', ctrl.guideWorkload);

module.exports = router;
