const activitiesRepo = require('../repository/activities.repository');
const guidesRepo = require('../repository/guides.repository'); 
const { pool } = require('../config/db.pg');
const { AppError }   = require('../utils/AppError');

// Utilidad: obtiene la fecha (YYYY-MM-DD) a partir de un ISO string
function toDateYMD(iso) {
  // Usa la parte de fecha en la zona del cliente; si prefieres UTC, ajústalo
  return new Date(iso).toISOString().split('T')[0];
}

/**
 * Orquesta el create:
 * 1) crea actividad
 * 2) setea idiomas
 * 3) si autoAssign = true → busca disponibilidad por fecha y asigna
 */
async function createActivityAndAssign(payload) {
  const {
    activityTypeId,
    title,
    partySize,
    start,
    end,
    languageIds = [],
    autoAssign = false,
    capacityPerGuide = null, // ej: 12
  } = payload;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) crear actividad
    const activity = await activitiesRepo.createActivity({ activityTypeId, title, partySize, start, end });

    // 2) idiomas
    if (languageIds.length) {
      await activitiesRepo.setActivityLanguages(activity.id, languageIds);
    }

    // 3) auto-asignación (simple):
    // Regla: 1 líder obligatorio; resto guías normales hasta cubrir partySize usando capacityPerGuide
    if (autoAssign) {
      const date = toDateYMD(start);

      // Disponibles por fecha / filtros
      const available = await activitiesRepo.getGuidesAvailabilityByDate({
        date,
        activityTypeId,
        languageIds,
      });

      // Separa líderes / normales
      const leaders = available.filter(g => g.is_leader && !g.is_busy); // asumiendo columnas de la función
      const normals = available.filter(g => !g.is_leader && !g.is_busy);

      if (!leaders.length) {
      throw new AppError(
        'No hay guías líderes disponibles',
        409,
        'NO_LEADERS_AVAILABLE',
        { activityId: activity.id, date: start, languageIds }
      );
    }

      const leader = leaders[0]; // la regla puede ser rotativa más adelante
      const perGuide = capacityPerGuide ?? 12; // default simple
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

    return {
      id: activity.id,
      title: activity.title,
      partySize: activity.party_size,
      start: activity.start_time,
      end: activity.end_time,
      autoAssigned: !!autoAssign,
    };
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

async function listActivities({ page, limit } = {}) {
  return activitiesRepo.listActivities({ page, limit });
}

async function getActivityById(activityId) {
  return activitiesRepo.getActivityById(activityId);
}

async function updateActivity(activityId, { activityTypeId, title, partySize, start, end, languageIds }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Actualizar actividad
    const activity = await activitiesRepo.updateActivity(activityId, {
      activityTypeId,
      title,
      partySize,
      start,
      end
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

async function deleteActivity(activityId) {
  return activitiesRepo.deleteActivity(activityId);
}

module.exports = {
  createActivityAndAssign,
  replaceAssignments,
  getActivitiesByDate,
  listActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
};
