const bookingsService = require('../services/bookings.service');
const { AppError } = require('../utils/AppError');
const { sendErrorResponse } = require('../utils/errorHandler');

/**
 * @openapi
 * /api/bookings/activities/{activityId}/schedules:
 *   get:
 *     tags: [Bookings]
 *     summary: Obtener fechas disponibles para una actividad
 *     description: Obtiene todas las planeaciones (fechas/horas) disponibles para una actividad específica. Solo muestra planeaciones activas y futuras con información de disponibilidad.
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único de la actividad
 *     responses:
 *       200:
 *         description: Lista de fechas disponibles con información de disponibilidad
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   activityId:
 *                     type: string
 *                     format: uuid
 *                   scheduledStart:
 *                     type: string
 *                     format: date-time
 *                   scheduledEnd:
 *                     type: string
 *                     format: date-time
 *                   status:
 *                     type: boolean
 *                   activityTitle:
 *                     type: string
 *                   partySize:
 *                     type: integer
 *                   bookedPeople:
 *                     type: integer
 *       404:
 *         description: Actividad no encontrada
 *       500:
 *         description: Error interno del servidor
 */
async function getAvailableSchedules(req, res) {
  try {
    const { activityId } = req.params;
    const schedules = await bookingsService.getAvailableSchedulesByActivityId(activityId);
    res.json(schedules);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener fechas disponibles');
  }
}

/**
 * @openapi
 * /api/bookings/schedules/{scheduleId}/availability:
 *   get:
 *     tags: [Bookings]
 *     summary: Validar disponibilidad de espacios
 *     description: Verifica la disponibilidad de espacios para una planeación específica. Retorna información sobre espacios totales, reservados y disponibles.
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único de la planeación (activity_schedule)
 *     responses:
 *       200:
 *         description: Información de disponibilidad
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 scheduleId:
 *                   type: string
 *                   format: uuid
 *                 activityId:
 *                   type: string
 *                   format: uuid
 *                 activityTitle:
 *                   type: string
 *                 partySize:
 *                   type: integer
 *                 bookedPeople:
 *                   type: integer
 *                 availableSpaces:
 *                   type: integer
 *       404:
 *         description: Planeación no encontrada
 *       500:
 *         description: Error interno del servidor
 */
async function checkAvailability(req, res) {
  try {
    const { scheduleId } = req.params;
    const availability = await bookingsService.checkAvailability(scheduleId);
    
    if (!availability) {
      return sendErrorResponse(res, { status: 404, message: 'Planeación no encontrada' });
    }
    
    res.json(availability);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al validar disponibilidad');
  }
}

/**
 * @openapi
 * /api/bookings:
 *   post:
 *     tags: [Bookings]
 *     summary: Crear una nueva reserva
 *     description: Crea una nueva reserva de actividad. Valida disponibilidad de espacios, puede asociar una compañía (socio) con comisión parametrizada o manual, y opcionalmente indicar si se requiere transporte con cantidad de pasajeros.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activityScheduleId
 *               - numberOfPeople
 *               - customerName
 *             properties:
 *               activityScheduleId:
 *                 type: string
 *                 format: uuid
 *                 description: ID de la planeación (fecha/hora) seleccionada
 *               companyId:
 *                 type: string
 *                 format: uuid
 *                 description: ID de la compañía (socio) - opcional. Si se proporciona, se usará su comisión parametrizada a menos que se especifique commissionPercentage manualmente
 *               transport:
 *                 type: boolean
 *                 default: false
 *                 description: Indica si se requiere transporte para la reserva
 *               numberOfPeople:
 *                 type: integer
 *                 minimum: 1
 *                 description: Cantidad de personas en la reserva
 *               passengerCount:
 *                 type: integer
 *                 minimum: 0
 *                 description: Cantidad de pasajeros para el transporte (opcional, solo si transport es true)
 *               commissionPercentage:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Porcentaje de comisión manual (opcional). Si se proporciona companyId y no se especifica este campo, se usará la comisión de la compañía
 *               customerName:
 *                 type: string
 *                 description: Nombre del cliente
 *               customerEmail:
 *                 type: string
 *                 format: email
 *                 description: Email del cliente (opcional)
 *               customerPhone:
 *                 type: string
 *                 description: Teléfono del cliente (opcional)
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled]
 *                 default: pending
 *                 description: Estado inicial de la reserva
 *               createdBy:
 *                 type: string
 *                 format: uuid
 *                 description: ID del usuario recepcionista que crea la reserva (opcional)
 *     responses:
 *       201:
 *         description: Reserva creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 activityScheduleId:
 *                   type: string
 *                   format: uuid
 *                 companyId:
 *                   type: string
 *                   format: uuid
 *                   nullable: true
 *                 transport:
 *                   type: boolean
 *                 numberOfPeople:
 *                   type: integer
 *                 passengerCount:
 *                   type: integer
 *                   nullable: true
 *                 commissionPercentage:
 *                   type: number
 *                   format: float
 *                 customerName:
 *                   type: string
 *                 customerEmail:
 *                   type: string
 *                   nullable: true
 *                 customerPhone:
 *                   type: string
 *                   nullable: true
 *                 status:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Datos inválidos, falta de disponibilidad o validación fallida
 *       404:
 *         description: Planeación, compañía o transporte no encontrado
 *       500:
 *         description: Error interno del servidor
 */
async function create(req, res) {
  try {
    const payload = req.body || {};
    
    if (!payload.activityScheduleId || !payload.numberOfPeople || !payload.customerName) {
      return res.status(400).json({ 
        message: 'activityScheduleId, numberOfPeople y customerName son requeridos' 
      });
    }

    if (payload.numberOfPeople <= 0) {
      return res.status(400).json({ 
        message: 'numberOfPeople debe ser mayor a 0' 
      });
    }

    const result = await bookingsService.createBooking(payload);
    res.status(201).json(result);
  } catch (e) {
    console.error(e);
    if (e instanceof AppError) {
      return res.status(e.status).json({
        message: e.message,
        code: e.code,
        details: e.details
      });
    }
    res.status(500).json({ message: 'Error al crear reserva: ' + e.message });
  }
}

/**
 * @openapi
 * /api/bookings:
 *   get:
 *     tags: [Bookings]
 *     summary: Listar todas las reservas
 *     description: Obtiene una lista paginada de todas las reservas. Permite filtrar por estado y por planeación.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Cantidad de registros por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled]
 *         description: Filtrar por estado de la reserva
 *       - in: query
 *         name: activityScheduleId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por ID de planeación específica
 *     responses:
 *       200:
 *         description: Lista paginada de reservas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       activityScheduleId:
 *                         type: string
 *                         format: uuid
 *                       companyId:
 *                         type: string
 *                         format: uuid
 *                         nullable: true
 *                       transport:
 *                         type: boolean
 *                       numberOfPeople:
 *                         type: integer
 *                       passengerCount:
 *                         type: integer
 *                         nullable: true
 *                       commissionPercentage:
 *                         type: number
 *                         format: float
 *                       customerName:
 *                         type: string
 *                       customerEmail:
 *                         type: string
 *                         nullable: true
 *                       customerPhone:
 *                         type: string
 *                         nullable: true
 *                       status:
 *                         type: string
 *                       activityTitle:
 *                         type: string
 *                       scheduledStart:
 *                         type: string
 *                         format: date-time
 *                       scheduledEnd:
 *                         type: string
 *                         format: date-time
 *                       companyName:
 *                         type: string
 *                         nullable: true
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: Parámetros inválidos
 *       500:
 *         description: Error interno del servidor
 */
async function list(req, res) {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    const status = req.query.status || null;
    const activityScheduleId = req.query.activityScheduleId || null;
    
    if (page < 1) {
      return sendErrorResponse(res, { status: 400, message: 'page debe ser mayor o igual a 1' });
    }
    if (limit < 1) {
      return sendErrorResponse(res, { status: 400, message: 'limit debe ser mayor o igual a 1' });
    }
    if (limit > 100) {
      return sendErrorResponse(res, { status: 400, message: 'limit no puede ser mayor a 100' });
    }
    
    const data = await bookingsService.listBookings({ page, limit, status, activityScheduleId });
    
    res.json({
      items: data.items,
      pagination: {
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages
      }
    });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al listar reservas');
  }
}

/**
 * @openapi
 * /api/bookings/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Obtener una reserva por ID
 *     description: Obtiene la información completa de una reserva incluyendo detalles de la actividad, planeación, compañía y transporte.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único de la reserva
 *     responses:
 *       200:
 *         description: Información completa de la reserva
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 activityScheduleId:
 *                   type: string
 *                   format: uuid
 *                 activityId:
 *                   type: string
 *                   format: uuid
 *                 activityTitle:
 *                   type: string
 *                 activityPartySize:
 *                   type: integer
 *                 scheduledStart:
 *                   type: string
 *                   format: date-time
 *                 scheduledEnd:
 *                   type: string
 *                   format: date-time
 *                 companyId:
 *                   type: string
 *                   format: uuid
 *                   nullable: true
 *                 companyName:
 *                   type: string
 *                   nullable: true
 *                 companyCommissionPercentage:
 *                   type: number
 *                   format: float
 *                   nullable: true
 *                 transport:
 *                   type: boolean
 *                 numberOfPeople:
 *                   type: integer
 *                 passengerCount:
 *                   type: integer
 *                   nullable: true
 *                 commissionPercentage:
 *                   type: number
 *                   format: float
 *                 customerName:
 *                   type: string
 *                 customerEmail:
 *                   type: string
 *                   nullable: true
 *                 customerPhone:
 *                   type: string
 *                   nullable: true
 *                 status:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Reserva no encontrada
 *       500:
 *         description: Error interno del servidor
 */
async function getById(req, res) {
  try {
    const { id } = req.params;
    const booking = await bookingsService.getBookingById(id);
    
    if (!booking) {
      return sendErrorResponse(res, { status: 404, message: 'Reserva no encontrada' });
    }
    
    res.json(booking);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener reserva');
  }
}

/**
 * @openapi
 * /api/bookings/{id}:
 *   put:
 *     tags: [Bookings]
 *     summary: Actualizar una reserva
 *     description: Actualiza la información de una reserva existente. Solo se actualizan los campos proporcionados. Valida disponibilidad si se cambia la planeación o el número de personas.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único de la reserva
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               activityScheduleId:
 *                 type: string
 *                 format: uuid
 *                 description: Nueva planeación (fecha/hora)
 *               companyId:
 *                 type: string
 *                 format: uuid
 *                 description: Nueva compañía asociada (puede ser null para eliminar)
 *               transport:
 *                 type: boolean
 *                 description: Indica si se requiere transporte para la reserva
 *               numberOfPeople:
 *                 type: integer
 *                 minimum: 1
 *                 description: Nueva cantidad de personas
 *               passengerCount:
 *                 type: integer
 *                 minimum: 0
 *                 description: Nueva cantidad de pasajeros para el transporte (opcional, solo si transport es true)
 *               commissionPercentage:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Nuevo porcentaje de comisión
 *               customerName:
 *                 type: string
 *               customerEmail:
 *                 type: string
 *                 format: email
 *               customerPhone:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled]
 *     responses:
 *       200:
 *         description: Reserva actualizada exitosamente
 *       400:
 *         description: Datos inválidos o falta de disponibilidad
 *       404:
 *         description: Reserva no encontrada
 *       500:
 *         description: Error interno del servidor
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    
    const booking = await bookingsService.updateBooking(id, payload);
    
    if (!booking) {
      return sendErrorResponse(res, { status: 404, message: 'Reserva no encontrada' });
    }
    
    res.json(booking);
  } catch (e) {
    console.error(e);
    if (e instanceof AppError) {
      return res.status(e.status).json({
        message: e.message,
        code: e.code,
        details: e.details
      });
    }
    sendErrorResponse(res, e, 500, 'Error al actualizar reserva');
  }
}

/**
 * @openapi
 * /api/bookings/{id}/cancel:
 *   put:
 *     tags: [Bookings]
 *     summary: Cancelar una reserva
 *     description: Cancela una reserva cambiando su estado a 'cancelled'. Esto libera los espacios reservados.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único de la reserva
 *     responses:
 *       200:
 *         description: Reserva cancelada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 activityScheduleId:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *                   example: cancelled
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: La reserva ya está cancelada
 *       404:
 *         description: Reserva no encontrada
 *       500:
 *         description: Error interno del servidor
 */
async function cancel(req, res) {
  try {
    const { id } = req.params;
    const booking = await bookingsService.cancelBooking(id);
    
    if (!booking) {
      return sendErrorResponse(res, { status: 404, message: 'Reserva no encontrada' });
    }
    
    res.json(booking);
  } catch (e) {
    console.error(e);
    if (e instanceof AppError) {
      return res.status(e.status).json({
        message: e.message,
        code: e.code,
        details: e.details
      });
    }
    sendErrorResponse(res, e, 500, 'Error al cancelar reserva');
  }
}

module.exports = { 
  getAvailableSchedules,
  checkAvailability,
  create,
  list,
  getById,
  update,
  cancel,
};

