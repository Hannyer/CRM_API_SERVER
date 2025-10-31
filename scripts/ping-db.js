require('dotenv').config();
const { Client } = require('pg');

(async () => {
  try {
    const url = process.env.DATABASE_URL;
    console.log('>> URL presente?', !!url);

    const client = new Client({
      connectionString: url,
      ssl: { require: true, rejectUnauthorized: false }, // para testear el canal TLS
      keepAlive: true,
    });
    await client.connect();

    const r1 = await client.query('select now() as ts, version()');
    console.log('✅ Conectado:', r1.rows[0]);

    await client.end();
  } catch (e) {
    console.error('❌ Falla conexión:', e);
  }
})();
