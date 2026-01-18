// src/services/user.service.js
const { getUsers, getUserByEmail } = require('../repository/user.repository');

/**
 * Busca un usuario por email (optimizado para login)
 * Retorna un solo objeto o null si no existe
 */
async function findByEmail(email) {
  if (!email) return null;
  // Usamos getUserByEmail que está optimizado para login (retorna objeto o null)
  // El password_hash se mantiene encriptado y se desencripta en el controller
  return await getUserByEmail(email);
}

/**
 * Obtiene todos los usuarios (para listado)
 */
async function findAll() {
  return await getUsers();
}

module.exports = { findByEmail, findAll };
