const referencePointsRepo = require('../repository/reference-points.repository');
const { AppError } = require('../utils/AppError');

function assertDescription(description) {
  if (description === undefined || description === null || typeof description !== 'string') {
    throw new AppError('description es requerido', 400);
  }
  if (!description.trim()) {
    throw new AppError('description no puede estar vacío', 400);
  }
}

async function listReferencePoints(params) {
  return referencePointsRepo.listReferencePoints(params);
}

async function getReferencePointById(id) {
  return referencePointsRepo.getReferencePointById(id);
}

async function createReferencePoint(payload, userId) {
  assertDescription(payload.description);
  return referencePointsRepo.createReferencePoint({
    description: payload.description,
    status: payload.status !== false,
    userId,
  });
}

async function updateReferencePoint(id, payload, userId) {
  if (payload.description !== undefined) {
    assertDescription(payload.description);
  }

  const updated = await referencePointsRepo.updateReferencePoint(id, {
    description: payload.description,
    status: payload.status,
    userId,
  });

  if (!updated) {
    throw new AppError('Punto de referencia no encontrado', 404);
  }

  return updated;
}

async function deleteReferencePoint(id, userId) {
  const deleted = await referencePointsRepo.deleteReferencePoint(id, userId);
  if (!deleted) {
    throw new AppError('Punto de referencia no encontrado', 404);
  }
  return deleted;
}

module.exports = {
  listReferencePoints,
  getReferencePointById,
  createReferencePoint,
  updateReferencePoint,
  deleteReferencePoint,
};
