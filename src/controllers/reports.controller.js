const reportsService = require('../services/reports.service');
const { AppError } = require('../utils/AppError');
const { sendErrorResponse } = require('../utils/errorHandler');

/** Envoltura común: lee from/to del query y ejecuta el reporte. */
function makeHandler(fn, errorMsg) {
  return async (req, res) => {
    try {
      const data = await fn({ from: req.query.from, to: req.query.to });
      res.json(data);
    } catch (e) {
      if (e instanceof AppError) return res.status(e.status).json({ message: e.message, code: e.code });
      console.error(e);
      sendErrorResponse(res, e, 500, errorMsg);
    }
  };
}

module.exports = {
  salesByPeriod: makeHandler(reportsService.salesByPeriod, 'Error al generar el reporte de ventas'),
  commissionsByCompany: makeHandler(reportsService.commissionsByCompany, 'Error al generar el reporte de comisiones'),
  occupancyBySchedule: makeHandler(reportsService.occupancyBySchedule, 'Error al generar el reporte de ocupación'),
  activityRanking: makeHandler(reportsService.activityRanking, 'Error al generar el ranking de actividades'),
  bookingsByStatus: makeHandler(reportsService.bookingsByStatus, 'Error al generar el reporte de estados'),
  transportByDriver: makeHandler(reportsService.transportByDriver, 'Error al generar el reporte de traslados'),
  guideWorkload: makeHandler(reportsService.guideWorkload, 'Error al generar el reporte de guías'),
};
