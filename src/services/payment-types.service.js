const paymentTypesRepo = require('../repository/payment-types.repository');

async function listPaymentTypes(params) {
  return paymentTypesRepo.listPaymentTypes(params);
}

async function getPaymentTypeById(id) {
  return paymentTypesRepo.getPaymentTypeById(id);
}

async function createPaymentType(payload) {
  return paymentTypesRepo.createPaymentType(payload);
}

async function updatePaymentType(id, payload) {
  return paymentTypesRepo.updatePaymentType(id, payload);
}

async function deletePaymentType(id) {
  return paymentTypesRepo.deletePaymentType(id);
}

module.exports = {
  listPaymentTypes,
  getPaymentTypeById,
  createPaymentType,
  updatePaymentType,
  deletePaymentType,
};

