const activitiesRepo = require('../repository/activities.repository');
const guidesRepo = require('../repository/guides.repository'); 
const { pool } = require('../config/db.pg');
const { AppError } = require('../utils/AppError');

// Utilidad: obtiene la fecha (YYYY-MM-DD) a partir de un ISO string
function toDateYMD(iso) {
  return new Date(iso).toISOString().split('T')[0];
}

/**
 * Crea una actividad (sin fechas) y opcionalmente una planeación inicial
 */
async function createActivity(payload) {
  const {
    activityTypeId,
    title,
    partySize,
    adultPrice,
    childPrice,
    seniorPrice,
    languageIds = [],
    status = true,
  } = payload;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Crear actividad
    const activity = await activitiesRepo.createActivity({ 
      activityTypeId, 
      title, 
      partySize,
      adultPrice,
      childPrice,
      seniorPrice,
      status 
    });

  
 
    await client.query('COMMIT');

    // Devolver actividad completa
    return activitiesRepo.getActivityById(activity.id);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Crea una actividad y asigna guías automáticamente basado en la primera planeación
 */
async function createActivityAndAssign(payload) {
  const {
    activityTypeId,
    title,
    partySize,
    adultPrice,
    childPrice,
    seniorPrice,
    status = true,
  } = payload;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Crear actividad
    const activity = await activitiesRepo.createActivity({ 
      activityTypeId, 
      title, 
      partySize,
      adultPrice,
      childPrice,
      seniorPrice,
      status 
    });


    await client.query('COMMIT');

    return activitiesRepo.getActivityById(activity.id);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function replaceAssignments(activityId, assignments = []) {
  await activitiesRepo.replaceAssignments(activityId, assignments);
}

async function getActivitiesByDate(date) {
  return activitiesRepo.getActivitiesByDate(date);
}

async function listActivities({ page, limit, status } = {}) {
  return activitiesRepo.listActivities({ page, limit, status });
}

async function getActivityById(activityId) {
  return activitiesRepo.getActivityById(activityId);
}

async function updateActivity(activityId, { activityTypeId, title, partySize, adultPrice, childPrice, seniorPrice, status, languageIds }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Actualizar actividad
    const activity = await activitiesRepo.updateActivity(activityId, {
      activityTypeId,
      title,
      partySize,
      adultPrice,
      childPrice,
      seniorPrice,
      status
    });

    if (!activity) {
      return null;
    }

    // Actualizar idiomas si se proporcionan
    if (languageIds !== undefined) {
      await activitiesRepo.setActivityLanguages(activityId, languageIds);
    }

    await client.query('COMMIT');
    
    // Devolver la actividad completa
    return activitiesRepo.getActivityById(activityId);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function toggleActivityStatus(activityId, status) {
  return activitiesRepo.toggleActivityStatus(activityId, status);
}

async function deleteActivity(activityId) {
  return activitiesRepo.deleteActivity(activityId);
}

// ========== SERVICIOS PARA PLANEACIONES ==========

async function createSchedule(activityId, { scheduledStart, scheduledEnd, capacity = 0, status = true }) {
  return activitiesRepo.createSchedule(activityId, { scheduledStart, scheduledEnd, capacity, status });
}

async function getScheduleById(scheduleId) {
  return activitiesRepo.getScheduleById(scheduleId);
}

async function getSchedulesByActivityId(activityId) {
  return activitiesRepo.getSchedulesByActivityId(activityId);
}

async function updateSchedule(scheduleId, { scheduledStart, scheduledEnd, capacity, status }) {
  return activitiesRepo.updateSchedule(scheduleId, { scheduledStart, scheduledEnd, capacity, status });
}

async function deleteSchedule(scheduleId) {
  return activitiesRepo.deleteSchedule(scheduleId);
}

async function toggleScheduleStatus(scheduleId, status) {
  return activitiesRepo.toggleScheduleStatus(scheduleId, status);
}

// ========== SERVICIOS PARA CAPACIDAD Y RESERVAS ==========

/**
 * Inserción masiva de horarios para una actividad
 */
async function bulkCreateSchedules(activityId, startDate, endDate, timeSlots, validateOverlaps = true) {
  // Validar que la actividad existe
  const activity = await activitiesRepo.getActivityById(activityId);
  if (!activity) {
    throw new AppError('Actividad no encontrada', 404, 'ACTIVITY_NOT_FOUND');
  }

  return activitiesRepo.bulkCreateSchedules(activityId, startDate, endDate, timeSlots, validateOverlaps);
}

/**
 * Suma asistentes a un horario específico
 */
async function addAttendeesToSchedule(scheduleId, quantity) {
  // Validar que el horario existe
  const schedule = await activitiesRepo.getScheduleById(scheduleId);
  if (!schedule) {
    throw new AppError('Horario no encontrado', 404, 'SCHEDULE_NOT_FOUND');
  }

  try {
    return await activitiesRepo.addAttendeesToSchedule(scheduleId, quantity);
  } catch (error) {
    // Convertir errores de capacidad en AppError
    if (error.code === 'CAPACITY_EXCEEDED') {
      throw new AppError(
        error.message || 'No hay suficiente capacidad disponible',
        409,
        'CAPACITY_EXCEEDED',
        {
          currentBooked: error.currentBooked,
          capacity: error.capacity,
          available: error.available,
          requested: error.requested
        }
      );
    }
    throw error;
  }
}

/**
 * Consulta disponibilidad de horarios
 */
async function getScheduleAvailability(filters = {}) {
  return activitiesRepo.getScheduleAvailability(filters);
}

/**
 * Obtiene horarios disponibles por día para una actividad
 */
async function getAvailableSchedulesByDate(activityId, date) {
  return activitiesRepo.getAvailableSchedulesByDate(activityId, date);
}

module.exports = {
  // Actividades
  createActivity,
  createActivityAndAssign,
  replaceAssignments,
  getActivitiesByDate,
  listActivities,
  getActivityById,
  updateActivity,
  toggleActivityStatus,
  deleteActivity,
  // Planeaciones
  createSchedule,
  getScheduleById,
  getSchedulesByActivityId,
  updateSchedule,
  deleteSchedule,
  toggleScheduleStatus,
  // Capacidad y reservas
  bulkCreateSchedules,
  addAttendeesToSchedule,
  getScheduleAvailability,
  getAvailableSchedulesByDate,
};
