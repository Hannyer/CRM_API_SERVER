const configRepo = require('../repository/config.repository');

async function getRolClienteValue() {
  const list = await configRepo.getConfigList({
    opcion: 0,
    key01: 'PARAMETRO',
    key02: 'FUNCIONALIDAD',
    key03: 'MRB',
    key04: 'ROL',
    key05: 'CLIENTE',
    key06: 'ROLCLIENTE',
    page: 1,
    pageSize: 10,
    search: '',
    sort: 'PK_CONFIGURATION',
    order: 'asc',
  });

  // Gracias al alias en el SELECT, ahora es 'value' en minúscula:
  return list?.[0]?.value ?? null;
}

async function listConfigurations({ page, limit } = {}) {
  return configRepo.listConfigurations({ page, limit });
}

async function listConfigurationsByKeys({ key01, key02, key03, key04, key05, key06 } = {}) {
  return configRepo.listConfigurationsByKeys({ key01, key02, key03, key04, key05, key06 });
}

async function createConfiguration({ 
  estado, 
  description, 
  observacion, 
  key01, 
  key02, 
  key03, 
  key04, 
  key05, 
  key06, 
  value, 
  displayName 
}) {
  return configRepo.createConfiguration({
    estado: estado ?? 1,
    description,
    observacion,
    key01,
    key02,
    key03,
    key04,
    key05,
    key06,
    value,
    displayName
  });
}

async function getConfigurationById(pkConfiguration) {
  return configRepo.getConfigurationById(pkConfiguration);
}

async function updateConfiguration(pkConfiguration, { 
  estado, 
  description, 
  observacion, 
  key01, 
  key02, 
  key03, 
  key04, 
  key05, 
  key06, 
  value, 
  displayName 
}) {
  const updateData = {};
  
  if (estado !== undefined) updateData.estado = estado;
  if (description !== undefined) updateData.description = description;
  if (observacion !== undefined) updateData.observacion = observacion;
  if (key01 !== undefined) updateData.key01 = key01;
  if (key02 !== undefined) updateData.key02 = key02;
  if (key03 !== undefined) updateData.key03 = key03;
  if (key04 !== undefined) updateData.key04 = key04;
  if (key05 !== undefined) updateData.key05 = key05;
  if (key06 !== undefined) updateData.key06 = key06;
  if (value !== undefined) updateData.value = value;
  if (displayName !== undefined) updateData.displayName = displayName;

  return configRepo.updateConfiguration(pkConfiguration, updateData);
}

async function deleteConfiguration(pkConfiguration) {
  return configRepo.deleteConfiguration(pkConfiguration);
}

module.exports = { 
  getRolClienteValue,
  listConfigurations,
  listConfigurationsByKeys,
  createConfiguration,
  getConfigurationById,
  updateConfiguration,
  deleteConfiguration,
};
