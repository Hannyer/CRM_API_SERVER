const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { decrypt } = require('./crypto-compat');
const { AppError } = require('./AppError');
const scrypt = promisify(crypto.scrypt);
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const prefix = 'scrypt$v1$';
function validPassword(value) { return typeof value === 'string' && value.length >= 6 && Buffer.byteLength(value, 'utf8') <= 1024; }
async function hashPassword(value, { legacyMigration = false } = {}) {
  const compatibleLegacy = legacyMigration && typeof value === 'string' && value.length > 0 && Buffer.byteLength(value, 'utf8') <= 1024;
  if (!validPassword(value) && !compatibleLegacy) throw new AppError('La contrasena debe tener al menos 6 caracteres y no exceder 1024 bytes', 400, 'INVALID_PASSWORD');
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scrypt(value, salt, 64, options);
  return `${prefix}${salt}$${key.toString('hex')}`;
}
function isModernHash(value) { return typeof value === 'string' && value.startsWith(prefix); }
async function verifyPassword(value, stored) {
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > 1024 || !stored) return false;
  if (isModernHash(stored)) {
    const parts = stored.split('$');
    if (parts.length !== 4 || !/^[a-f0-9]{32}$/.test(parts[2]) || !/^[a-f0-9]{128}$/.test(parts[3])) return false;
    return crypto.timingSafeEqual(await scrypt(value, parts[2], 64, options), Buffer.from(parts[3], 'hex'));
  }
  try {
    return crypto.timingSafeEqual(crypto.createHash('sha256').update(decrypt(stored)).digest(), crypto.createHash('sha256').update(value).digest());
  } catch { return false; }
}
module.exports = { hashPassword, verifyPassword, isModernHash };
