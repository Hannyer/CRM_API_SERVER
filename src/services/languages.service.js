const languagesRepo = require('../repository/languages.repository');

async function listLanguages({ page, limit } = {}) {
  return languagesRepo.listLanguages({ page, limit });
}

async function createLanguage({ code, name, status }) {
  return languagesRepo.createLanguage({
    code,
    name,
    status: status !== false,
  });
}

async function getLanguageById(languageId) {
  return languagesRepo.getLanguageById(languageId);
}

async function updateLanguage(languageId, { code, name, status }) {
  const updateData = {};
  
  if (code !== undefined) updateData.code = code;
  if (name !== undefined) updateData.name = name;
  if (status !== undefined) updateData.status = status;

  return languagesRepo.updateLanguage(languageId, updateData);
}

async function deleteLanguage(languageId) {
  return languagesRepo.deleteLanguage(languageId);
}

module.exports = {
  listLanguages,
  createLanguage,
  getLanguageById,
  updateLanguage,
  deleteLanguage,
};

