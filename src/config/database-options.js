const fs = require('node:fs');
const path = require('node:path');
function databaseOptions(env = process.env) {
  if (!env.DATABASE_URL) throw new Error('[CONFIG] DATABASE_URL is required.');
  const url = new URL(env.DATABASE_URL);
  const local = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname);
  const production = env.NODE_ENV === 'production';
  if (production && env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new Error('[CONFIG] Global TLS verification must remain enabled.');
  const mode = url.searchParams.get('sslmode');
  if (production && mode === 'disable') throw new Error('[CONFIG] Production database connections require TLS.');
  const supabase = url.hostname.endsWith('.supabase.com') || url.hostname.endsWith('.supabase.co');
  const ca = env.DATABASE_SSL_CA
    ? env.DATABASE_SSL_CA.split(String.fromCharCode(92) + 'n').join(String.fromCharCode(10))
    : supabase ? fs.readFileSync(path.join(__dirname, 'certificates', 'supabase-root.crt'), 'utf8') : undefined;
  const ssl = production || !local || (mode && mode !== 'disable')
    ? { rejectUnauthorized: true, ...(ca ? { ca } : {}) }
    : false;
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  return { connectionString: url.toString(), ssl };
}
module.exports = { databaseOptions };
