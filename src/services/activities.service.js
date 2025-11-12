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
    languageIds = [],
    status = true,
    // Opcional: primera planeación al crear
    scheduledStart,
    scheduledEnd,
  } = payload;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Crear actividad
    const activity = await activitiesRepo.createActivity({ 
      activityTypeId, 
      title, 
      partySize, 
      status 
    });

    // 2) Idiomas
    if (languageIds.length) {
      await activitiesRepo.setActivityLanguages(activity.id, languageIds);
    }

    // 3) Crear primera planeación si se proporciona
    if (scheduledStart && scheduledEnd) {
      await activitiesRepo.createSchedule(activity.id, {
        scheduledStart,
        scheduledEnd,
        status: true
      });
    }

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
    scheduledStart,
    scheduledEnd,
    languageIds = [],
    autoAssign = false,
    capacityPerGuide = null,
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
      status 
    });

    // 2) Idiomas
    if (languageIds.length) {
      await activitiesRepo.setActivityLanguages(activity.id, languageIds);
    }

    // 3) Crear planeación
    if (scheduledStart && scheduledEnd) {
      await activitiesRepo.createSchedule(activity.id, {
        scheduledStart,
        scheduledEnd,
        status: true
      });
    }

    // 4) Auto-asignación de guías
    if (autoAssign && scheduledStart && scheduledEnd) {
      const date = toDateYMD(scheduledStart);

      const available = await activitiesRepo.getGuidesAvailabilityByDate({
        date,
        activityTypeId,
        languageIds,
      });

      const leaders = available.filter(g => g.is_leader && !g.is_busy);
      const normals = available.filter(g => !g.is_leader && !g.is_busy);

      if (!leaders.length) {
        throw new AppError(
          'No hay guías líderes disponibles',
          409,
          'NO_LEADERS_AVAILABLE',
          { activityId: activity.id, date: scheduledStart, languageIds }
        );
      }

      const leader = leaders[0];
      const perGuide = capacityPerGuide ?? 12;
      const guidesNeeded = Math.max(1, Math.ceil((partySize - perGuide) / perGuide) + 1);

      const chosen = [leader];
      for (const g of normals) {
        if (chosen.length >= guidesNeeded) break;
        chosen.push(g);
      }

      const assignments = chosen.map((g, idx) => ({
        guideId: g.id,
        isLeader: idx === 0,
      }));

      await activitiesRepo.insertAssignments(activity.id, assignments);
    }

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

async function updateActivity(activityId, { activityTypeId, title, partySize, status, languageIds }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Actualizar actividad
    const activity = await activitiesRepo.updateActivity(activityId, {
      activityTypeId,
      title,
      partySize,
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

async function createSchedule(activityId, { scheduledStart, scheduledEnd, status = true }) {
  return activitiesRepo.createSchedule(activityId, { scheduledStart, scheduledEnd, status });
}

async function getScheduleById(scheduleId) {
  return activitiesRepo.getScheduleById(scheduleId);
}

async function getSchedulesByActivityId(activityId) {
  return activitiesRepo.getSchedulesByActivityId(activityId);
}

async function updateSchedule(scheduleId, { scheduledStart, scheduledEnd, status }) {
  return activitiesRepo.updateSchedule(scheduleId, { scheduledStart, scheduledEnd, status });
}

async function deleteSchedule(scheduleId) {
  return activitiesRepo.deleteSchedule(scheduleId);
}

async function toggleScheduleStatus(scheduleId, status) {
  return activitiesRepo.toggleScheduleStatus(scheduleId, status);
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
};
