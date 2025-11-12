// src/services/activity-types.service.js
const activityTypesRepo = require('../repository/activity-types.repository');

async function listActivityTypes() {
  return activityTypesRepo.listActivityTypes();
}

async function getActivityTypeById(activityTypeId) {
  return activityTypesRepo.getActivityTypeById(activityTypeId);
}

module.exports = {
  listActivityTypes,
  getActivityTypeById,
};

