require('dotenv').config();

const { Client } = require('pg');

const DATABASE_URL = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;
const SCHEMA = process.env.TRUNCATE_SCHEMA || 'ops';
const MODE = process.argv[2] || 'inspect';

const KEEP_TABLES = new Set([
  'role',
  'role_menu_permission',
  'payment_type',
  'menu',
  'license_type',
  'language',
  'configuration',
  'card_type',
  'app_user',
  'app_user_license',
]);

function quoteIdent(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

function qname(schema, table) {
  return `${quoteIdent(schema)}.${quoteIdent(table)}`;
}

function createClient() {
  if (!DATABASE_URL) throw new Error('TARGET_DATABASE_URL o DATABASE_URL no esta definido');
  return new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

async function listTables(db) {
  const result = await db.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = $1
        AND table_type = 'BASE TABLE'
      ORDER BY table_name`,
    [SCHEMA],
  );
  return result.rows.map((row) => row.table_name);
}

async function tableCounts(db, tables) {
  const rows = [];
  for (const table of tables) {
    const result = await db.query(`SELECT count(*)::bigint AS count FROM ${qname(SCHEMA, table)}`);
    rows.push({ table, count: Number(result.rows[0].count), keep: KEEP_TABLES.has(table) });
  }
  return rows;
}

async function inspect() {
  const db = createClient();
  await db.connect();
  try {
    const tables = await listTables(db);
    const counts = await tableCounts(db, tables);
    console.log(`schema ${SCHEMA}: ${tables.length} tables`);
    counts.forEach((row) => {
      console.log(`${row.keep ? 'KEEP' : 'TRUNCATE'} ${row.table}: ${row.count}`);
    });
  } finally {
    await db.end();
  }
}

async function truncate() {
  const db = createClient();
  await db.connect();
  try {
    const tables = await listTables(db);
    const missingKeepTables = [...KEEP_TABLES].filter((table) => !tables.includes(table));
    if (missingKeepTables.length > 0) {
      throw new Error(`No existen estas tablas exceptuadas: ${missingKeepTables.join(', ')}`);
    }

    const tablesToTruncate = tables.filter((table) => !KEEP_TABLES.has(table));
    if (tablesToTruncate.length === 0) {
      console.log('No hay tablas para truncar');
      return;
    }

    console.log(`truncating ${tablesToTruncate.length} tables`);
    await db.query('BEGIN');
    await db.query(`TRUNCATE TABLE ${tablesToTruncate.map((table) => qname(SCHEMA, table)).join(', ')} RESTART IDENTITY`);
    await db.query('COMMIT');
    tablesToTruncate.forEach((table) => console.log(`truncated ${table}`));
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await db.end();
  }
}

(async () => {
  if (MODE === 'inspect') return inspect();
  if (MODE === 'truncate') return truncate();
  throw new Error(`Modo no soportado: ${MODE}`);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
