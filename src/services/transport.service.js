const transportRepo = require('../repository/transport.repository');

async function listTransports({ page, limit } = {}) {
  return transportRepo.listTransports({ page, limit });
}

async function createTransport({ capacity, model, operationalStatus, status }) {
  return transportRepo.createTransport({
    capacity,
    model,
    operationalStatus: operationalStatus !== false,
    status: status !== false,
  });
}

async function getTransportById(transportId) {
  return transportRepo.getTransportById(transportId);
}

async function updateTransport(transportId, { capacity, model, operationalStatus, status }) {
  const updateData = {};
  
  if (capacity !== undefined) updateData.capacity = capacity;
  if (model !== undefined) updateData.model = model;
  if (operationalStatus !== undefined) updateData.operationalStatus = !!operationalStatus;
  if (status !== undefined) updateData.status = status;

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

