const activityTypesRepo = require('../repository/activity-types.repository');
const { AppError } = require('../utils/AppError');

function normalizeName(name) {
  return name.trim();
}

async function assertUniqueActivityTypeName(name, excludeActivityTypeId = null) {
  const normalized = normalizeName(name);
  const exists = await activityTypesRepo.existsActivityTypeByName(normalized, excludeActivityTypeId);
  if (exists) {
    throw new AppError(
      'Ya existe un tipo de actividad con ese nombre',
      409,
      'DUPLICATE_ACTIVITY_TYPE_NAME'
    );
  }
  return normalized;
}

async function listActivityTypes({ page, limit, status } = {}) {
  return activityTypesRepo.listActivityTypes({ page, limit, status });
}

async function createActivityType({ name, description, status }) {
  const normalizedName = await assertUniqueActivityTypeName(name);
  return activityTypesRepo.createActivityType({
    name: normalizedName,
    description: description ?? null,
    status: status !== false,
  });
}

async function getActivityTypeById(activityTypeId) {
  return activityTypesRepo.getActivityTypeById(activityTypeId);
}

async function updateActivityType(activityTypeId, { name, description, status }) {
  const updateData = {};

  if (name !== undefined) {
    updateData.name = await assertUniqueActivityTypeName(name, activityTypeId);
  }
  if (description !== undefined) {
    updateData.description = description === null || description === '' ? null : description;
  }
  if (status !== undefined) {
    updateData.status = !!status;
  }

  return activityTypesRepo.updateActivityType(activityTypeId, updateData);
}

async function deleteActivityType(activityTypeId) {
  return activityTypesRepo.deleteActivityType(activityTypeId);
}

module.exports = {
  listActivityTypes,
  createActivityType,
  getActivityTypeById,
  updateActivityType,
  deleteActivityType,
};
