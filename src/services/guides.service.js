const guidesRepo = require('../repository/guides.repository');

async function getAvailability(params) {
  return guidesRepo.getAvailability(params);
}


async function listGuides({ page, limit } = {}) {
  return guidesRepo.listGuides({ page, limit });
}

async function createGuide({ fullName, email, phone, status, languageIds = [] }) {
  // Crear el guía primero
  const guide = await guidesRepo.createGuide({
    name: fullName,     
    email,
    phone,
    status: status !== false,
  });

  // Si se proporcionaron idiomas, asignarlos
  if (languageIds && Array.isArray(languageIds) && languageIds.length > 0) {
    await guidesRepo.setGuideLanguages(guide.id, languageIds);
    // Devolver el guía completo con sus idiomas
    return guidesRepo.getGuideById(guide.id);
  }

  // Si no hay idiomas, devolver el guía sin idiomas
  return guide;
}

async function getGuideById(guideId) {
  return guidesRepo.getGuideById(guideId);
}

async function updateGuide(guideId, { fullName, email, phone, status, languageIds }) {
  const updateData = {};
  
  if (fullName !== undefined) updateData.name = fullName;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (status !== undefined) updateData.status = status;

  // Actualizar los datos básicos del guía
  const guide = await guidesRepo.updateGuide(guideId, updateData);
  
  if (!guide) {
    return null;
  }

  // Si se proporcionaron idiomas, actualizarlos
  if (languageIds !== undefined) {
    await guidesRepo.setGuideLanguages(guideId, languageIds);
    // Devolver el guía completo con idiomas actualizados
    return guidesRepo.getGuideById(guideId);
  }

  // Si no se proporcionaron idiomas, devolver el guía con sus idiomas actuales
  return guide;
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