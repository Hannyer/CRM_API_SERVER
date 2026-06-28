// src/services/booking-assignments.service.js
const assignmentsRepo = require('../repository/booking-assignments.repository');
const bookingsRepo = require('../repository/bookings.repository');
const transportRepo = require('../repository/transport.repository');
const { AppError } = require('../utils/AppError');

const MAX_GUIDES_PER_BOOKING = 5;

/**
 * Obtiene las asignaciones actuales de una reserva
 */
async function getAssignments(bookingId) {
  const booking = await bookingsRepo.getBookingById(bookingId);
  if (!booking) {
    throw new AppError('Reserva no encontrada', 404);
  }
  return assignmentsRepo.getAssignmentsByBookingId(bookingId);
}

/**
 * Lista los guías disponibles. Si recibe bookingId, excluye guías con cruces de horario.
 */
async function getAvailableGuides(bookingId = null) {
  return assignmentsRepo.getAvailableGuides(bookingId);
}

async function getAvailableDrivers() {
  return assignmentsRepo.getAvailableDrivers();
}

async function listScheduleGuideAssignments() {
  return assignmentsRepo.listScheduleGuideAssignments();
}

async function getAvailableGuidesByScheduleId(activityScheduleId) {
  const guides = await assignmentsRepo.getAvailableGuidesByScheduleId(activityScheduleId);
  if (guides === null) {
    throw new AppError('Salida de actividad no encontrada', 404);
  }
  return guides;
}

function assertGuidesSelectableForSchedule(guides, guideIds) {
  const unavailable = guideIds
    .map((guideId) => guides.find((guide) => guide.id === guideId))
    .filter((guide) => !guide || !guide.isAvailable);

  if (unavailable.length === 0) {
    return;
  }

  const details = unavailable
    .map((guide) => {
      if (!guide) return 'un guía desconocido';
      if (guide.scheduleConflict?.activityTitle) {
        return `${guide.fullName} (ocupado en "${guide.scheduleConflict.activityTitle}")`;
      }
      return guide.fullName;
    })
    .join(', ');

  throw new AppError(
    `Solo puedes asignar guías disponibles sin cruce de horario. No disponibles: ${details}`,
    400,
    'GUIDE_SCHEDULE_CONFLICT'
  );
}

async function assignScheduleGuides(activityScheduleId, guideIds = []) {
  const scheduleExists = await assignmentsRepo.activityScheduleExists(activityScheduleId);
  if (!scheduleExists) {
    throw new AppError('Salida de actividad no encontrada', 404);
  }

  if (guideIds.length > MAX_GUIDES_PER_BOOKING) {
    throw new AppError(
      `Se puede asignar un máximo de ${MAX_GUIDES_PER_BOOKING} guías por salida`,
      400
    );
  }

  const uniqueIds = [...new Set(guideIds)];
  if (uniqueIds.length !== guideIds.length) {
    throw new AppError('La lista de guías contiene IDs duplicados', 400);
  }

  if (uniqueIds.length > 0) {
    const guides = await assignmentsRepo.getGuidesWithScheduleAvailability(activityScheduleId);
    assertGuidesSelectableForSchedule(guides, uniqueIds);
  }

  await assignmentsRepo.setScheduleGuides(activityScheduleId, uniqueIds);
  return assignmentsRepo.listScheduleGuideAssignments();
}

async function listBookingTransportAssignments() {
  return assignmentsRepo.listBookingTransportAssignments();
}

/**
 * Asigna guías a una reserva
 * - Máximo 5 guías por reserva
 * - La reserva debe estar en estado pending o confirmed
 */
async function assignGuides(bookingId, guideIds = []) {
  // Validar reserva
  const booking = await bookingsRepo.getBookingById(bookingId);
  if (!booking) {
    throw new AppError('Reserva no encontrada', 404);
  }
  if (booking.status === 'cancelled') {
    throw new AppError('No se pueden asignar guías a una reserva cancelada', 400);
  }

  // Validar máximo de guías
  if (guideIds.length > MAX_GUIDES_PER_BOOKING) {
    throw new AppError(
      `Se puede asignar un máximo de ${MAX_GUIDES_PER_BOOKING} guías por reserva`,
      400
    );
  }

  // Validar que no haya IDs duplicados
  const uniqueIds = [...new Set(guideIds)];
  if (uniqueIds.length !== guideIds.length) {
    throw new AppError('La lista de guías contiene IDs duplicados', 400);
  }

  if (uniqueIds.length > 0 && booking.activityScheduleId) {
    const guides = await assignmentsRepo.getGuidesWithScheduleAvailability(
      booking.activityScheduleId
    );
    assertGuidesSelectableForSchedule(guides, uniqueIds);
  }

  return assignmentsRepo.setBookingGuides(bookingId, uniqueIds);
}

/**
 * Asigna un transporte a una reserva
 * - El transporte debe estar operacional
 * - La reserva debe tener transport = true
 */
async function assignTransport(bookingId, transportId, driverId = null) {
  // Validar reserva
  const booking = await bookingsRepo.getBookingById(bookingId);
  if (!booking) {
    throw new AppError('Reserva no encontrada', 404);
  }
  if (booking.status === 'cancelled') {
    throw new AppError('No se puede asignar transporte a una reserva cancelada', 400);
  }
  if (!booking.transport) {
    throw new AppError('Esta reserva no requiere transporte', 400);
  }

  // Si se proporciona transportId, validar que exista y esté operacional
  if (transportId) {
    const transport = await transportRepo.getTransportById(transportId);
    if (!transport) {
      throw new AppError('Transporte no encontrado', 404);
    }
    if (!transport.operationalStatus) {
      throw new AppError('El transporte seleccionado no está operacional', 400);
    }
    if (!transport.status) {
      throw new AppError('El transporte seleccionado no está activo', 400);
    }
  }

  return assignmentsRepo.setBookingTransport(bookingId, transportId || null, driverId || null);
}

async function listMyGuideAssignments(userId) {
  return assignmentsRepo.listGuideAssignmentsByUser(userId);
}

async function listMyDriverAssignments(userId) {
  return assignmentsRepo.listDriverAssignmentsByUser(userId);
}

/**
 * Confirma una reserva cambiando su estado a 'confirmed'
 * Validaciones:
 * - La reserva debe estar en estado 'pending'
 * - Debe tener al menos 1 guía asignado
 * - Si transport = true, debe tener transporte asignado
 */
async function confirmBooking(bookingId) {
  // Validar reserva
  const booking = await bookingsRepo.getBookingById(bookingId);
  if (!booking) {
    throw new AppError('Reserva no encontrada', 404);
  }
  if (booking.status !== 'pending') {
    throw new AppError(
      `La reserva no puede confirmarse porque su estado actual es '${booking.status}'`,
      400
    );
  }

  // Obtener asignaciones actuales
  const assignments = await assignmentsRepo.getAssignmentsByBookingId(bookingId);

  // Validar al menos 1 guía
  if (!assignments.guides || assignments.guides.length === 0) {
    throw new AppError(
      'Debe asignar al menos un guía antes de confirmar la reserva',
      400
    );
  }

  // Si la reserva requiere transporte, validar que tenga uno asignado
  if (booking.transport && !assignments.transport) {
    throw new AppError(
      'Esta reserva requiere transporte. Debe asignar un vehículo antes de confirmar',
      400
    );
  }

  const confirmed = await assignmentsRepo.confirmBooking(bookingId);
  if (!confirmed) {
    throw new AppError('No se pudo confirmar la reserva', 500);
  }

  return {
    ...confirmed,
    guides: assignments.guides,
    transport: assignments.transport,
  };
}

module.exports = {
  getAssignments,
  getAvailableGuides,
  getAvailableDrivers,
  listScheduleGuideAssignments,
  getAvailableGuidesByScheduleId,
  assignScheduleGuides,
  listBookingTransportAssignments,
  assignGuides,
  assignTransport,
  listMyGuideAssignments,
  listMyDriverAssignments,
  confirmBooking,
};
