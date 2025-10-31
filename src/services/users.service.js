// src/services/user.service.js
const { getUsers } = require('../repository/user.repository');

async function findByEmail(email) {
  const list = await getUsers({ opcion: 0, email });
  // El C# desencripta antes de comparar; aquí devolvemos tal cual y
  // dejamos el “desencriptar” en el controller (para no acoplar).
  return list?.[0] || null;
}

module.exports = { findByEmail };
