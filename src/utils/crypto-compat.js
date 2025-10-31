// src/utils/crypto-compat.js
const crypto = require('crypto');

// === Parámetros idénticos a C# ===
const PASS_BASE = 'HotelMalibu';
const SALT_ASCII = 's@lAvz';
const ITERATIONS = 1;                 // igual que tu C#
const HASH = 'md5';                   // igual que tu C#
const IV_ASCII = '@1B2c3D4e5F6g7H8';  // 16 bytes ASCII
const KEY_LEN = 16;                   // 128 bits

function md5(buf) {
  return crypto.createHash('md5').update(buf).digest();
}

/**
 * Emulación de PasswordDeriveBytes (MD5) como en .NET
 * Orden clásico: hash( hash(...prev...) + SALT + PASS )
 * Iterations=1 => un solo hash por bloque
 */
function deriveKey_PDB(passwordUtf8, saltAscii, iterations, keyLen) {
  const passBuf = Buffer.from(passwordUtf8, 'utf8');
  const saltBuf = Buffer.from(saltAscii, 'ascii');

  let key = Buffer.alloc(0);
  let prev = Buffer.alloc(0);

  while (key.length < keyLen) {
    // D_i = MD5( D_{i-1} || SALT || PASS )
    let d = Buffer.concat([prev, saltBuf, passBuf]);

    // iteraciones (si fuera >1, se re-hasharía d iter-1 veces)
    for (let i = 0; i < iterations; i++) d = md5(d);

    key = Buffer.concat([key, d]);
    prev = d;
  }
  return key.slice(0, keyLen);
}

/**
 * Variante por si tu proyecto histórico hubiera usado PASS || SALT.
 * La probamos como fallback si la principal falla.
 */
function deriveKey_PDB_PassSalt(passwordUtf8, saltAscii, iterations, keyLen) {
  const passBuf = Buffer.from(passwordUtf8, 'utf8');
  const saltBuf = Buffer.from(saltAscii, 'ascii');

  let key = Buffer.alloc(0);
  let prev = Buffer.alloc(0);

  while (key.length < keyLen) {
    // D_i = MD5( D_{i-1} || PASS || SALT )
    let d = Buffer.concat([prev, passBuf, saltBuf]);

    for (let i = 0; i < iterations; i++) d = md5(d);

    key = Buffer.concat([key, d]);
    prev = d;
  }
  return key.slice(0, keyLen);
}

function decrypt(base64Cipher) {
  const iv = Buffer.from(IV_ASCII, 'ascii');
  const c = Buffer.from(String(base64Cipher || '').trim(), 'base64');

  // 1) Intento principal (SALT || PASS)
  try {
    const key = deriveKey_PDB(PASS_BASE, SALT_ASCII, ITERATIONS, KEY_LEN);
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    const dec = Buffer.concat([decipher.update(c), decipher.final()]);
    return dec.toString('utf8');
  } catch (_) {
    // 2) Fallback (PASS || SALT)
    const key2 = deriveKey_PDB_PassSalt(PASS_BASE, SALT_ASCII, ITERATIONS, KEY_LEN);
    const decipher2 = crypto.createDecipheriv('aes-128-cbc', key2, iv);
    const dec2 = Buffer.concat([decipher2.update(c), decipher2.final()]);
    return dec2.toString('utf8');
  }
}

function encrypt(plainText) {
  const iv = Buffer.from(IV_ASCII, 'ascii');
  const key = deriveKey_PDB(PASS_BASE, SALT_ASCII, ITERATIONS, KEY_LEN);
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(String(plainText), 'utf8')), cipher.final()]);
  return enc.toString('base64');
}

module.exports = { encrypt, decrypt };
