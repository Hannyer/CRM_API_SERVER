const reportsRepo = require('../repository/reports.repository');
const { AppError } = require('../utils/AppError');

/** Valida y normaliza el rango de fechas [from, to). */
function normalizeRange({ from, to } = {}) {
  if (!from || !to) throw new AppError('Debes indicar el rango de fechas (from y to)', 400);
  const f = new Date(from);
  const t = new Date(to);
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) {
    throw new AppError('Fechas inválidas', 400);
  }
  if (f >= t) throw new AppError('La fecha inicial debe ser menor que la final', 400);
  return { from: f.toISOString(), to: t.toISOString() };
}

async function salesByPeriod(range) { return reportsRepo.salesByPeriod(normalizeRange(range)); }
async function commissionsByCompany(range) { return reportsRepo.commissionsByCompany(normalizeRange(range)); }
async function occupancyBySchedule(range) { return reportsRepo.occupancyBySchedule(normalizeRange(range)); }
async function activityRanking(range) { return reportsRepo.activityRanking(normalizeRange(range)); }
async function bookingsByStatus(range) { return reportsRepo.bookingsByStatus(normalizeRange(range)); }
async function transportByDriver(range) { return reportsRepo.transportByDriver(normalizeRange(range)); }
async function guideWorkload(range) { return reportsRepo.guideWorkload(normalizeRange(range)); }

module.exports = {
  salesByPeriod,
  commissionsByCompany,
  occupancyBySchedule,
  activityRanking,
  bookingsByStatus,
  transportByDriver,
  guideWorkload,
};
