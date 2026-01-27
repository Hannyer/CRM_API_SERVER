const bookingsRepo = require('../repository/bookings.repository');
const companiesRepo = require('../repository/companies.repository');
const { AppError } = require('../utils/AppError');

/**
 * Obtiene las fechas disponibles (planeaciones) para una actividad específica
 */
async function getAvailableSchedulesByActivityId(activityId) {
  return bookingsRepo.getAvailableSchedulesByActivityId(activityId);
}

/**
 * Valida la disponibilidad de espacios para una planeación específica
 */
async function checkAvailability(scheduleId) {
  return bookingsRepo.checkAvailability(scheduleId);
}

/**
 * Crea una nueva reserva con validaciones
 */
async function createBooking(payload) {
  const {
    activityScheduleId,
    companyId = null,
    transport = false,
    numberOfPeople,
    adultCount = 0,
    childCount = 0,
    seniorCount = 0,
    passengerCount = null,
    commissionPercentage = null, // Si es null, se usa el de la compañía
    customerName,
    customerEmail = null,
    customerPhone = null,
    status = 'pending',
    createdBy = null
  } = payload;

  // Validar que se proporcione la cantidad de personas
  if (!numberOfPeople || numberOfPeople <= 0) {
    throw new AppError('numberOfPeople debe ser mayor a 0', 400);
  }

  // Validar que los conteos no sean negativos
  if (adultCount < 0 || childCount < 0 || seniorCount < 0) {
    throw new AppError('adultCount, childCount y seniorCount no pueden ser negativos', 400);
  }

  // Validar que la suma de adultCount + childCount + seniorCount sea igual a numberOfPeople
  const totalCount = adultCount + childCount + seniorCount;
  if (totalCount !== numberOfPeople) {
    throw new AppError(
      `La suma de adultCount (${adultCount}) + childCount (${childCount}) + seniorCount (${seniorCount}) debe ser igual a numberOfPeople (${numberOfPeople})`,
      400
    );
  }

  // Validar disponibilidad
  const availability = await bookingsRepo.checkAvailability(activityScheduleId);
  if (!availability) {
    throw new AppError('La planeación especificada no existe o no está disponible', 404);
  }

  if (availability.availableSpaces < numberOfPeople) {
    throw new AppError(
      `No hay suficientes espacios disponibles. Espacios disponibles: ${availability.availableSpaces}, solicitados: ${numberOfPeople}`,
      400
    );
  }

  // Determinar el porcentaje de comisión
  let finalCommissionPercentage = commissionPercentage;

  if (companyId) {
    const company = await companiesRepo.getCompanyById(companyId);
    if (!company) {
      throw new AppError('La compañía especificada no existe', 404);
    }
    if (!company.status) {
      throw new AppError('La compañía especificada no está activa', 400);
    }

    // Si no se proporciona comisión manual, usar la de la compañía
    if (commissionPercentage === null || commissionPercentage === undefined) {
      finalCommissionPercentage = parseFloat(company.commissionPercentage);
    }
  }

  // Si no hay compañía y no se proporciona comisión, usar 0
  if (finalCommissionPercentage === null || finalCommissionPercentage === undefined) {
    finalCommissionPercentage = 0;
  }

  // Validar que la comisión esté en el rango válido
  if (finalCommissionPercentage < 0 || finalCommissionPercentage > 100) {
    throw new AppError('El porcentaje de comisión debe estar entre 0 y 100', 400);
  }

  // Validar passenger_count si transport es true
  if (transport && passengerCount !== null && passengerCount !== undefined) {
    if (passengerCount < 0) {
      throw new AppError('passengerCount no puede ser negativo', 400);
    }
  }

  // Crear la reserva
  const booking = await bookingsRepo.createBooking({
    activityScheduleId,
    companyId,
    transport,
    numberOfPeople,
    adultCount,
    childCount,
    seniorCount,
    passengerCount,
    commissionPercentage: finalCommissionPercentage,
    customerName,
    customerEmail,
    customerPhone,
    status,
    createdBy
  });

  return booking;
}

/**
 * Lista todas las reservas con paginación
 */
async function listBookings({ page, limit, status, activityScheduleId } = {}) {
  return bookingsRepo.listBookings({ page, limit, status, activityScheduleId });
}

/**
 * Obtiene una reserva por ID
 */
async function getBookingById(bookingId) {
  return bookingsRepo.getBookingById(bookingId);
}

/**
 * Actualiza una reserva existente con validaciones
 */
async function updateBooking(bookingId, payload) {
  const {
    activityScheduleId,
    companyId,
    transport,
    numberOfPeople,
    adultCount,
    childCount,
    seniorCount,
    passengerCount,
    commissionPercentage,
    customerName,
    customerEmail,
    customerPhone,
    status
  } = payload;

  // Validar que los conteos no sean negativos si se proporcionan
  if (adultCount !== undefined && adultCount < 0) {
    throw new AppError('adultCount no puede ser negativo', 400);
  }
  if (childCount !== undefined && childCount < 0) {
    throw new AppError('childCount no puede ser negativo', 400);
  }
  if (seniorCount !== undefined && seniorCount < 0) {
    throw new AppError('seniorCount no puede ser negativo', 400);
  }

  // Si se actualizan los conteos o numberOfPeople, validar que coincidan
  if (adultCount !== undefined || childCount !== undefined || seniorCount !== undefined || numberOfPeople !== undefined) {
    const booking = await bookingsRepo.getBookingById(bookingId);
    if (!booking) {
      throw new AppError('Reserva no encontrada', 404);
    }

    const finalAdultCount = adultCount !== undefined ? adultCount : booking.adultCount;
    const finalChildCount = childCount !== undefined ? childCount : booking.childCount;
    const finalSeniorCount = seniorCount !== undefined ? seniorCount : booking.seniorCount;
    const finalNumberOfPeople = numberOfPeople !== undefined ? numberOfPeople : booking.numberOfPeople;

    const totalCount = finalAdultCount + finalChildCount + finalSeniorCount;
    if (totalCount !== finalNumberOfPeople) {
      throw new AppError(
        `La suma de adultCount (${finalAdultCount}) + childCount (${finalChildCount}) + seniorCount (${finalSeniorCount}) debe ser igual a numberOfPeople (${finalNumberOfPeople})`,
        400
      );
    }
  }

  // Si se está cambiando la planeación o el número de personas, validar disponibilidad
  if (activityScheduleId !== undefined || numberOfPeople !== undefined) {
    const booking = await bookingsRepo.getBookingById(bookingId);
    if (!booking) {
      throw new AppError('Reserva no encontrada', 404);
    }

    const scheduleIdToCheck = activityScheduleId || booking.activityScheduleId;
    const peopleToCheck = numberOfPeople || booking.numberOfPeople;
    const currentPeople = booking.numberOfPeople;

    const availability = await bookingsRepo.checkAvailability(scheduleIdToCheck);
    if (!availability) {
      throw new AppError('La planeación especificada no existe o no está disponible', 404);
    }

    // Calcular espacios disponibles considerando la reserva actual si es la misma planeación
    let availableSpaces = availability.availableSpaces;
    if (scheduleIdToCheck === booking.activityScheduleId) {
      // Si es la misma planeación, sumar las personas de esta reserva a los espacios disponibles
      availableSpaces += currentPeople;
    }

    if (availableSpaces < peopleToCheck) {
      throw new AppError(
        `No hay suficientes espacios disponibles. Espacios disponibles: ${availableSpaces}, solicitados: ${peopleToCheck}`,
        400
      );
    }
  }

  // Validar comisión si se proporciona
  if (commissionPercentage !== undefined) {
    if (commissionPercentage < 0 || commissionPercentage > 100) {
      throw new AppError('El porcentaje de comisión debe estar entre 0 y 100', 400);
    }
  }

  // Validar passenger_count si transport es true
  if (transport !== undefined && transport && passengerCount !== null && passengerCount !== undefined) {
    if (passengerCount < 0) {
      throw new AppError('passengerCount no puede ser negativo', 400);
    }
  }

  return bookingsRepo.updateBooking(bookingId, payload);
}

/**
 * Cancela una reserva
 */
async function cancelBooking(bookingId) {
  const booking = await bookingsRepo.getBookingById(bookingId);
  if (!booking) {
    throw new AppError('Reserva no encontrada', 404);
  }

  if (booking.status === 'cancelled') {
    throw new AppError('La reserva ya está cancelada', 400);
  }

  return bookingsRepo.cancelBooking(bookingId);
}

module.exports = {
  getAvailableSchedulesByActivityId,
  checkAvailability,
  createBooking,
  listBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
};

