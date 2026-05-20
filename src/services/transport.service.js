const transportRepo = require('../repository/transport.repository');
const { AppError } = require('../utils/AppError');

function normalizeLicensePlate(licensePlate) {
  return licensePlate.trim().toUpperCase();
}

async function assertUniqueLicensePlate(licensePlate, excludeTransportId = null) {
  const normalized = normalizeLicensePlate(licensePlate);
  const exists = await transportRepo.existsTransportByLicensePlate(normalized, excludeTransportId);
  if (exists) {
    throw new AppError(
      'Ya existe un transporte registrado con esa placa',
      409,
      'DUPLICATE_LICENSE_PLATE'
    );
  }
  return normalized;
}

async function listTransports({ page, limit } = {}) {
  return transportRepo.listTransports({ page, limit });
}

async function createTransport({ capacity, model, operationalStatus, status, licensePlate, circulationPermitExpirationDate, ctpExpirationDate }) {
  const normalizedPlate = await assertUniqueLicensePlate(licensePlate);
  return transportRepo.createTransport({
    capacity,
    model,
    operationalStatus: operationalStatus !== false,
    status: status !== false,
    licensePlate: normalizedPlate,
    circulationPermitExpirationDate,
    ctpExpirationDate,
  });
}
async function getTransportById(transportId) {
  return transportRepo.getTransportById(transportId);
}

async function updateTransport(transportId, {
  capacity,
  model,
  operationalStatus,
  status,
  licensePlate,
  circulationPermitExpirationDate,
  ctpExpirationDate,
}) {
  const updateData = {};

  if (capacity !== undefined) updateData.capacity = capacity;
  if (model !== undefined) updateData.model = model;
  if (operationalStatus !== undefined) updateData.operationalStatus = !!operationalStatus;
  if (status !== undefined) updateData.status = status;
  if (licensePlate !== undefined) {
    updateData.licensePlate = await assertUniqueLicensePlate(licensePlate, transportId);
  }
  if (circulationPermitExpirationDate !== undefined) {
    updateData.circulationPermitExpirationDate = circulationPermitExpirationDate;
  }
  if (ctpExpirationDate !== undefined) updateData.ctpExpirationDate = ctpExpirationDate;

  return transportRepo.updateTransport(transportId, updateData);
}

async function deleteTransport(transportId) {
  return transportRepo.deleteTransport(transportId);
}

async function getAvailableTransports({ page, limit } = {}) {
  return transportRepo.getAvailableTransports({ page, limit });
}

module.exports = {
  listTransports,
  createTransport,
  getTransportById,
  updateTransport,
  deleteTransport,
  getAvailableTransports,
};

