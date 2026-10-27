const secret = String(process.env.JWT_SECRET || '').trim();
const insecure = new Set(['super-secret-default-key', 'secret', 'changeme', 'jwt_secret', 'test']);
if (secret.length < 32 || insecure.has(secret.toLowerCase())) {
  throw new Error('[CONFIG] JWT_SECRET must be a private random value of at least 32 characters.');
}
module.exports = { JWT_SECRET: secret };
