const guidesRepo = require('../repository/guides.repository');

async function getAvailability(params) {
  return guidesRepo.getAvailability(params);
}


async function listGuides() {
  return guidesRepo.listGuides();
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

async function setGuideLanguages(guideId, languageIds = []) {
  return guidesRepo.setGuideLanguages(guideId, languageIds);
}

module.exports = {
  getAvailability,
  listGuides,
  createGuide,
  setGuideLanguages,
};