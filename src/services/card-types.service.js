const cardTypesRepo = require('../repository/card-types.repository');

async function listCardTypes(params) {
  return cardTypesRepo.listCardTypes(params);
}

async function getCardTypeById(id) {
  return cardTypesRepo.getCardTypeById(id);
}

async function createCardType(payload) {
  return cardTypesRepo.createCardType(payload);
}

async function updateCardType(id, payload) {
  return cardTypesRepo.updateCardType(id, payload);
}

async function deleteCardType(id) {
  return cardTypesRepo.deleteCardType(id);
}

module.exports = {
  listCardTypes,
  getCardTypeById,
  createCardType,
  updateCardType,
  deleteCardType,
};

