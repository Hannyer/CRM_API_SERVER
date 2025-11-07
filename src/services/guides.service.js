const guidesRepo = require('../repository/guides.repository');

async function getAvailability(params) {
  return guidesRepo.getAvailability(params);
}


async function listGuides({ page, limit } = {}) {
  return guidesRepo.listGuides({ page, limit });
}

async function createGuide({ fullName, email, phone, isLeader, status, maxPartySize }) {
  return guidesRepo.createGuide({
    name: fullName,     
    email,
    phone,
    isLeader: !!isLeader,
    status: status !== false,
    maxPartySize: maxPartySize ?? null,
  });
}

async function getGuideById(guideId) {
  return guidesRepo.getGuideById(guideId);
}

async function updateGuide(guideId, { fullName, email, phone, isLeader, status, maxPartySize }) {
  const updateData = {};
  
  if (fullName !== undefined) updateData.name = fullName;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (isLeader !== undefined) updateData.isLeader = !!isLeader;
  if (status !== undefined) updateData.status = status;
  if (maxPartySize !== undefined) updateData.maxPartySize = maxPartySize ?? null;

  return guidesRepo.updateGuide(guideId, updateData);
}

async function deleteGuide(guideId) {
  return guidesRepo.deleteGuide(guideId);
}

async function setGuideLanguages(guideId, languageIds = []) {
  return guidesRepo.setGuideLanguages(guideId, languageIds);
}

module.exports = {
  getAvailability,
  listGuides,
  createGuide,
  getGuideById,
  updateGuide,
  deleteGuide,
  setGuideLanguages,
};