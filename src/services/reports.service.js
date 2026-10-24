const reportsRepo = require('../repository/reports.repository');
const { AppError } = require('../utils/AppError');

/** Valida y normaliza el rango de fechas [from, to). */
function normalizeRange({ from, to } = {}) {
  if (!from || !to) throw new AppError('Debes indicar el rango de fechas (from y to)', 400);
  const f = new Date(from);
  let t = new Date(to);
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) {
    throw new AppError('Fechas inválidas', 400);
  }

  // "Hasta" se entiende como un dia incluido. Si llega solo la fecha, sin hora,
  // se corre al final de ese dia; asi consultar un mismo dia (desde = hasta)
  // devuelve lo de ese dia en vez de un rango vacio.
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(to).trim())) {
    t = new Date(t.getTime() + 24 * 60 * 60 * 1000);
  }

  if (f >= t) throw new AppError('La fecha inicial no puede ser posterior a la final', 400);
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
