const { getConfigList } = require('../repository/config.repository');

async function getRolClienteValue() {
  const list = await getConfigList({
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

module.exports = { getRolClienteValue };
