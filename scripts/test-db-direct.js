// scripts/test-db-direct.js
const { Client } = require('pg');

(async () => {
  require('dotenv').config(); // carga .env explícitamente
  const url = process.env.DATABASE_URL;
  console.log('>> DATABASE_URL present?', !!url);

  if (!url) {
    console.error('❌ Falta DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    ssl: { require: true, rejectUnauthorized: false },
    keepAlive: true,
  });

  try {
    await client.connect();
    const { rows } = await client.query('select now() as ts');
    console.log('✅ Conectado:', rows[0]);
  } catch (e) {
    console.error('❌ Falla conexión:', e);
  } finally {
    await client.end().catch(() => {});
  }
})();
