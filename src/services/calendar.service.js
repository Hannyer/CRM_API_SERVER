const crypto = require('crypto');
const calendarRepo = require('../repository/calendar.repository');
const { AppError } = require('../utils/AppError');

// Ventana de eventos que se exporta al calendario del guía.
const DAYS_BACK = 90;
const DAYS_FORWARD = 400;

function generateToken() {
  return crypto.randomBytes(24).toString('hex'); // 48 caracteres hex
}

/**
 * Devuelve el token del guía; si no tiene, genera uno y lo guarda.
 */
async function getOrCreateToken(userId) {
  const existing = await calendarRepo.getCalendarToken(userId);
  if (existing) return existing;
  const token = generateToken();
  return calendarRepo.setCalendarToken(userId, token);
}

/**
 * Reemplaza el token del guía por uno nuevo (invalida el enlace anterior).
 */
async function regenerateToken(userId) {
  const token = generateToken();
  return calendarRepo.setCalendarToken(userId, token);
}

/** Escapa un texto para un valor de propiedad iCalendar (RFC 5545). */
function escapeText(value) {
  return String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Fecha JS -> formato UTC iCalendar: YYYYMMDDTHHMMSSZ */
function toICalDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

/** Plegado de líneas a 75 octetos (RFC 5545): continúa con CRLF + espacio. */
function foldLine(line) {
  if (line.length <= 73) return line;
  const parts = [];
  let rest = line;
  parts.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 72) {
    parts.push(' ' + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  if (rest.length) parts.push(' ' + rest);
  return parts.join('\r\n');
}

function calendarHeader(calName) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CoreLink//Operations//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calName)}`,
    'X-WR-TIMEZONE:America/Costa_Rica',
  ];
}

function buildGuideICalendar(fullName, assignments, now) {
  const stamp = toICalDate(now);
  const lines = calendarHeader(`Mis actividades - ${fullName}`);
  for (const a of assignments) {
    const desc = `${a.totalPeople || 0} personas · ${a.bookingCount || 0} reservas`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${a.activityScheduleId}@corelink-crm`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toICalDate(a.scheduledStart)}`,
      `DTEND:${toICalDate(a.scheduledEnd)}`,
      `SUMMARY:${escapeText(a.activityTitle)}`,
      `DESCRIPTION:${escapeText(desc)}`,
      a.updatedAt ? `LAST-MODIFIED:${toICalDate(a.updatedAt)}` : null,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.filter((l) => l !== null).map(foldLine).join('\r\n') + '\r\n';
}

function buildDriverICalendar(fullName, trips, now) {
  const stamp = toICalDate(now);
  const lines = calendarHeader(`Mis traslados - ${fullName}`);
  for (const t of trips) {
    const start = t.pickupAt || t.scheduledStart;
    const pickupTxt = t.pickupAt
      ? `Recogida ${new Date(t.pickupAt).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Costa_Rica' })}`
      : '';
    const descParts = [
      `Cliente: ${t.customerName}`,
      t.customerPhone ? `Tel: ${t.customerPhone}` : null,
      `${t.numberOfPeople || 0} personas`,
      `Vehículo: ${t.model} ${t.licensePlate}`,
      pickupTxt || null,
    ].filter(Boolean);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${t.bookingId}-driver@corelink-crm`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toICalDate(start)}`,
      `DTEND:${toICalDate(t.scheduledEnd)}`,
      `SUMMARY:${escapeText(`${t.activityTitle} - ${t.customerName}`)}`,
      `DESCRIPTION:${escapeText(descParts.join(' · '))}`,
      t.referencePointDescription ? `LOCATION:${escapeText(t.referencePointDescription)}` : null,
      t.updatedAt ? `LAST-MODIFIED:${toICalDate(t.updatedAt)}` : null,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.filter((l) => l !== null).map(foldLine).join('\r\n') + '\r\n';
}

/**
 * Construye el .ics del guía a partir de su token de suscripción.
 * Lanza 404 si el token no corresponde a ningún guía activo.
 */
async function buildGuideCalendarByToken(token) {
  if (!token) throw new AppError('Token no proporcionado', 404);
  const user = await calendarRepo.getUserByCalendarToken(token);
  if (!user) throw new AppError('Calendario no encontrado', 404);

  const now = new Date();
  const fromDate = new Date(now.getTime() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString();
  const toDate = new Date(now.getTime() + DAYS_FORWARD * 24 * 60 * 60 * 1000).toISOString();

  const assignments = await calendarRepo.listGuideAssignmentsForCalendar(user.id, { fromDate, toDate });
  const ics = buildGuideICalendar(user.fullName || 'Guía', assignments, now);
  return { ics, filename: 'corelink-actividades.ics' };
}

/**
 * Construye el .ics de traslados de un chofer a partir de su token.
 * Lanza 404 si el token no corresponde a ningún usuario activo.
 */
async function buildDriverCalendarByToken(token) {
  if (!token) throw new AppError('Token no proporcionado', 404);
  const user = await calendarRepo.getUserByCalendarToken(token);
  if (!user) throw new AppError('Calendario no encontrado', 404);

  const now = new Date();
  const fromDate = new Date(now.getTime() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString();
  const toDate = new Date(now.getTime() + DAYS_FORWARD * 24 * 60 * 60 * 1000).toISOString();

  const trips = await calendarRepo.listDriverAssignmentsForCalendar(user.id, { fromDate, toDate });
  const ics = buildDriverICalendar(user.fullName || 'Conductor', trips, now);
  return { ics, filename: 'corelink-traslados.ics' };
}

module.exports = {
  getOrCreateToken,
  regenerateToken,
  buildGuideCalendarByToken,
  buildDriverCalendarByToken,
};
