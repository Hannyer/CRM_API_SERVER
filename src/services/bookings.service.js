const bookingsRepo = require('../repository/bookings.repository');
const companiesRepo = require('../repository/companies.repository');
const referencePointsRepo = require('../repository/reference-points.repository');
const { AppError } = require('../utils/AppError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeRequiredEmail(email) {
  if (typeof email !== 'string' || !email.trim()) {
    throw new AppError('customerEmail es requerido', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new AppError('customerEmail debe tener un formato válido', 400);
  }

  return normalizedEmail;
}

function normalizeReferencePointDescription(description) {
  if (typeof description !== 'string') return null;
  const normalized = description.trim();
  return normalized || null;
}

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
 * Obtiene configuración de bookings por ID
 */
async function GetConfigurationsBookings(configurationId) {
  return bookingsRepo.getConfigurationsBookings(configurationId);
}

/**
 * Crea una nueva reserva con validaciones
 */
async function createBooking(payload) {
  const {
    activityScheduleId,
    companyId = null,
    referencePointId = null,
    referencePointDescription = null,
    transport = false,
    numberOfPeople,
    adultCount = 0,
    childCount = 0,
    seniorCount = 0,
    infantCount = 0,
    passengerCount = null,
    comment = null,
    paymentTypeId,
    commissionPercentage = null, // Si es null, se usa el de la compañía
    subtotal = null,
    vatAmount = null,
    total = null,
    exempt = false,
    commissionAmount = null,
    customerName,
    customerEmail,
    customerPhone = null,
    status = 'pending',
    createdBy = null
  } = payload;

  // Validar que se proporcione la cantidad de personas
  if (!numberOfPeople || numberOfPeople <= 0) {
    throw new AppError('numberOfPeople debe ser mayor a 0', 400);
  }

  // Validar que los conteos no sean negativos
  if (adultCount < 0 || childCount < 0 || seniorCount < 0 || infantCount < 0) {
    throw new AppError('adultCount, childCount, seniorCount e infantCount no pueden ser negativos', 400);
  }

  // Validar que la suma por categoria sea igual a numberOfPeople
  const totalCount = adultCount + childCount + seniorCount + infantCount;
  if (totalCount !== numberOfPeople) {
    throw new AppError(
      `La suma de adultCount (${adultCount}) + childCount (${childCount}) + seniorCount (${seniorCount}) + infantCount (${infantCount}) debe ser igual a numberOfPeople (${numberOfPeople})`,
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

  let finalReferencePointId = null;
  let finalReferencePointDescription = null;

  if (transport) {
    if (referencePointId) {
      const referencePoint = await referencePointsRepo.getReferencePointById(referencePointId);
      if (!referencePoint) {
        throw new AppError('El punto de referencia especificado no existe', 404);
      }
      if (!referencePoint.status) {
        throw new AppError('El punto de referencia especificado no está activo', 400);
      }
      finalReferencePointId = referencePointId;
      finalReferencePointDescription = referencePoint.description;
    } else {
      finalReferencePointDescription = normalizeReferencePointDescription(referencePointDescription);
      if (!finalReferencePointDescription) {
        throw new AppError('referencePointDescription es requerido cuando la reserva requiere transporte sin punto de referencia de catálogo', 400);
      }
    }
  }

  // Validar passenger_count si transport es true
  if (transport && passengerCount !== null && passengerCount !== undefined) {
    if (passengerCount < 0) {
      throw new AppError('passengerCount no puede ser negativo', 400);
    }
  }

  // Validar paymentTypeId requerido
  if (!paymentTypeId) {
    throw new AppError('paymentTypeId es requerido', 400);
  }

  const normalizedCustomerEmail = normalizeRequiredEmail(customerEmail);

  const nonNegativeMoney = (label, value) => {
    if (value === null || value === undefined) return;
    const n = Number(value);
    if (Number.isNaN(n) || n < 0) {
      throw new AppError(`${label} debe ser un número mayor o igual a 0`, 400);
    }
  };
  nonNegativeMoney('subtotal', subtotal);
  nonNegativeMoney('vatAmount', vatAmount);
  nonNegativeMoney('total', total);
  nonNegativeMoney('commissionAmount', commissionAmount);

  // Crear la reserva
  const booking = await bookingsRepo.createBooking({
    activityScheduleId,
    companyId,
    referencePointId: finalReferencePointId,
    referencePointDescription: finalReferencePointDescription,
    transport,
    numberOfPeople,
    adultCount,
    childCount,
    seniorCount,
    infantCount,
    passengerCount,
    comment,
    paymentTypeId,
    cardTypeId: null,
    commissionPercentage: finalCommissionPercentage,
    subtotal,
    vatAmount,
    total,
    exempt: Boolean(exempt),
    commissionAmount,
    customerName,
    customerEmail: normalizedCustomerEmail,
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
    referencePointId,
    referencePointDescription,
    transport,
    numberOfPeople,
    adultCount,
    childCount,
    seniorCount,
    infantCount,
    passengerCount,
    commissionPercentage,
    subtotal,
    vatAmount,
    total,
    exempt,
    commissionAmount,
    customerName,
    customerEmail,
    customerPhone,
    status
  } = payload;

  const updatePayload = { ...payload };
  delete updatePayload.cardTypeId;

  if (transport !== undefined || referencePointId !== undefined || referencePointDescription !== undefined) {
    const booking = await bookingsRepo.getBookingById(bookingId);
    if (!booking) {
      throw new AppError('Reserva no encontrada', 404);
    }

    const finalTransport = transport !== undefined ? transport : booking.transport;
    const finalReferencePointId = referencePointId !== undefined ? referencePointId : booking.referencePointId;
    const finalReferencePointDescription = referencePointDescription !== undefined
      ? normalizeReferencePointDescription(referencePointDescription)
      : normalizeReferencePointDescription(booking.referencePointDescription);

    if (finalTransport) {
      if (finalReferencePointId) {
        const referencePoint = await referencePointsRepo.getReferencePointById(finalReferencePointId);
        if (!referencePoint) {
          throw new AppError('El punto de referencia especificado no existe', 404);
        }
        if (!referencePoint.status) {
          throw new AppError('El punto de referencia especificado no está activo', 400);
        }
        updatePayload.referencePointId = finalReferencePointId;
        updatePayload.referencePointDescription = referencePoint.description;
      } else {
        if (!finalReferencePointDescription) {
          throw new AppError('referencePointDescription es requerido cuando la reserva requiere transporte sin punto de referencia de catálogo', 400);
        }
        updatePayload.referencePointId = null;
        updatePayload.referencePointDescription = finalReferencePointDescription;
      }
    } else {
      updatePayload.referencePointId = null;
      updatePayload.referencePointDescription = null;
    }
  }

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
  if (infantCount !== undefined && infantCount < 0) {
    throw new AppError('infantCount no puede ser negativo', 400);
  }

  // Si se actualizan los conteos o numberOfPeople, validar que coincidan
  if (adultCount !== undefined || childCount !== undefined || seniorCount !== undefined || infantCount !== undefined || numberOfPeople !== undefined) {
    const booking = await bookingsRepo.getBookingById(bookingId);
    if (!booking) {
      throw new AppError('Reserva no encontrada', 404);
    }

    const finalAdultCount = adultCount !== undefined ? adultCount : booking.adultCount;
    const finalChildCount = childCount !== undefined ? childCount : booking.childCount;
    const finalSeniorCount = seniorCount !== undefined ? seniorCount : booking.seniorCount;
    const finalInfantCount = infantCount !== undefined ? infantCount : booking.infantCount;
    const finalNumberOfPeople = numberOfPeople !== undefined ? numberOfPeople : booking.numberOfPeople;

    const totalCount = finalAdultCount + finalChildCount + finalSeniorCount + finalInfantCount;
    if (totalCount !== finalNumberOfPeople) {
      throw new AppError(
        `La suma de adultCount (${finalAdultCount}) + childCount (${finalChildCount}) + seniorCount (${finalSeniorCount}) + infantCount (${finalInfantCount}) debe ser igual a numberOfPeople (${finalNumberOfPeople})`,
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

  const nonNegativeMoney = (label, value) => {
    if (value === null || value === undefined) return;
    const n = Number(value);
    if (Number.isNaN(n) || n < 0) {
      throw new AppError(`${label} debe ser un número mayor o igual a 0`, 400);
    }
  };
  nonNegativeMoney('subtotal', subtotal);
  nonNegativeMoney('vatAmount', vatAmount);
  nonNegativeMoney('total', total);
  nonNegativeMoney('commissionAmount', commissionAmount);

  if (customerEmail !== undefined) {
    updatePayload.customerEmail = normalizeRequiredEmail(customerEmail);
  }

  // Validar passenger_count si transport es true
  if (transport !== undefined && transport && passengerCount !== null && passengerCount !== undefined) {
    if (passengerCount < 0) {
      throw new AppError('passengerCount no puede ser negativo', 400);
    }
  }

  return bookingsRepo.updateBooking(bookingId, updatePayload);
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
  GetConfigurationsBookings,
  createBooking,
  listBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
};

