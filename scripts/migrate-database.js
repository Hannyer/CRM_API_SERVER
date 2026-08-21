require('dotenv').config();

const { Client } = require('pg');

const SOURCE_URL = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
const TARGET_URL = process.env.TARGET_DATABASE_URL;
const SCHEMA = process.env.MIGRATE_SCHEMA || 'ops';
const MODE = process.argv[2] || 'inspect';
const RESET = process.argv.includes('--reset') || process.env.RESET_TARGET_SCHEMA === 'true';

function client(url) {
  return new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
}

function quoteIdent(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

function qname(schema, name) {
  return `${quoteIdent(schema)}.${quoteIdent(name)}`;
}

async function connectBoth() {
  if (!SOURCE_URL) throw new Error('SOURCE_DATABASE_URL o DATABASE_URL no esta definido');
  if (!TARGET_URL) throw new Error('TARGET_DATABASE_URL no esta definido');

  const source = client(SOURCE_URL);
  const target = client(TARGET_URL);
  await source.connect();
  await target.connect();
  return { source, target };
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
  const counts = [];
  for (const table of tables) {
    const result = await db.query(`SELECT count(*)::bigint AS count FROM ${qname(SCHEMA, table)}`);
    counts.push({ table, count: Number(result.rows[0].count) });
  }
  return counts;
}

async function inspect() {
  const { source, target } = await connectBoth();
  try {
    const sourceTables = await listTables(source);
    const targetTables = await listTables(target);
    const sourceCounts = await tableCounts(source, sourceTables);
    const targetCounts = await tableCounts(target, targetTables);

    console.log(`source schema ${SCHEMA}: ${sourceTables.length} tables`);
    sourceCounts.forEach((row) => console.log(`source ${row.table}: ${row.count}`));
    console.log(`target schema ${SCHEMA}: ${targetTables.length} tables`);
    targetCounts.forEach((row) => console.log(`target ${row.table}: ${row.count}`));
  } finally {
    await source.end();
    await target.end();
  }
}

async function getEnums(source) {
  const result = await source.query(
    `SELECT t.typname AS name, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
       FROM pg_type t
       JOIN pg_enum e ON e.enumtypid = t.oid
       JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = $1
      GROUP BY t.typname
      ORDER BY t.typname`,
    [SCHEMA],
  );
  return result.rows;
}

async function getColumns(source, table) {
  const result = await source.query(
    `SELECT a.attname AS name,
            pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
            a.attnotnull AS not_null,
            pg_get_expr(d.adbin, d.adrelid) AS default_expr,
            a.attidentity AS identity
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE n.nspname = $1
        AND c.relname = $2
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY a.attnum`,
    [SCHEMA, table],
  );
  return result.rows;
}

async function getConstraints(source) {
  const result = await source.query(
    `SELECT conname AS name, contype AS type, conrelid::regclass::text AS table_name, pg_get_constraintdef(oid) AS definition
       FROM pg_constraint
      WHERE connamespace = $1::regnamespace
        AND conrelid <> 0
      ORDER BY CASE contype WHEN 'p' THEN 1 WHEN 'u' THEN 2 WHEN 'c' THEN 3 WHEN 'f' THEN 4 ELSE 5 END, conname`,
    [SCHEMA],
  );
  return result.rows;
}

async function getIndexes(source) {
  const result = await source.query(
    `SELECT i.relname AS name, pg_get_indexdef(i.oid) AS definition
       FROM pg_index x
       JOIN pg_class i ON i.oid = x.indexrelid
       JOIN pg_class t ON t.oid = x.indrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       LEFT JOIN pg_constraint c ON c.conindid = i.oid
      WHERE n.nspname = $1
        AND c.oid IS NULL
      ORDER BY i.relname`,
    [SCHEMA],
  );
  return result.rows;
}

async function getFunctions(source) {
  const result = await source.query(
    `SELECT pg_get_functiondef(p.oid) AS definition
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = $1
      ORDER BY p.proname, pg_get_function_identity_arguments(p.oid)`,
    [SCHEMA],
  );
  return result.rows.map((row) => row.definition);
}

async function getTriggers(source) {
  const result = await source.query(
    `SELECT pg_get_triggerdef(t.oid) AS definition
       FROM pg_trigger t
       JOIN pg_class c ON c.oid = t.tgrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = $1
        AND NOT t.tgisinternal
      ORDER BY t.tgname`,
    [SCHEMA],
  );
  return result.rows.map((row) => row.definition);
}

async function getViews(source) {
  const result = await source.query(
    `SELECT table_name, view_definition
       FROM information_schema.views
      WHERE table_schema = $1
      ORDER BY table_name`,
    [SCHEMA],
  );
  return result.rows;
}

async function copyTable(source, target, table) {
  const columns = await getColumns(source, table);
  const columnNames = columns.map((column) => column.name);
  const sourceResult = await source.query(`SELECT ${columnNames.map(quoteIdent).join(', ')} FROM ${qname(SCHEMA, table)}`);

  if (sourceResult.rows.length === 0) return 0;

  const batchSize = 200;
  for (let offset = 0; offset < sourceResult.rows.length; offset += batchSize) {
    const batch = sourceResult.rows.slice(offset, offset + batchSize);
    const values = [];
    const placeholders = batch.map((row, rowIndex) => {
      const rowPlaceholders = columnNames.map((column, columnIndex) => {
        values.push(row[column]);
        return `$${rowIndex * columnNames.length + columnIndex + 1}`;
      });
      return `(${rowPlaceholders.join(', ')})`;
    });

    await target.query(
      `INSERT INTO ${qname(SCHEMA, table)} (${columnNames.map(quoteIdent).join(', ')}) VALUES ${placeholders.join(', ')}`,
      values,
    );
  }

  return sourceResult.rows.length;
}

async function migrate() {
  const { source, target } = await connectBoth();
  try {
    const sourceTables = await listTables(source);
    const targetTables = await listTables(target);
    const targetCounts = await tableCounts(target, targetTables);
    const targetHasRows = targetCounts.some((row) => row.count > 0);

    if ((targetTables.length > 0 || targetHasRows) && !RESET) {
      throw new Error(`El destino ya tiene objetos en ${SCHEMA}. Ejecuta con --reset si deseas reemplazar ese esquema.`);
    }

    console.log('starting migration');
    await target.query('BEGIN');

    if (RESET) {
      console.log(`dropping target schema ${SCHEMA}`);
      await target.query(`DROP SCHEMA IF EXISTS ${quoteIdent(SCHEMA)} CASCADE`);
    }

    await target.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await target.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await target.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdent(SCHEMA)}`);

    const enums = await getEnums(source);
    for (const type of enums) {
      const labels = type.labels.map((label) => `'${String(label).replace(/'/g, "''")}'`).join(', ');
      await target.query(`CREATE TYPE ${qname(SCHEMA, type.name)} AS ENUM (${labels})`);
    }

    for (const table of sourceTables) {
      const columns = await getColumns(source, table);
      const columnSql = columns.map((column) => {
        const parts = [quoteIdent(column.name), column.type];
        if (column.identity === 'a') parts.push('GENERATED ALWAYS AS IDENTITY');
        if (column.identity === 'd') parts.push('GENERATED BY DEFAULT AS IDENTITY');
        if (column.default_expr && !column.identity) parts.push(`DEFAULT ${column.default_expr}`);
        if (column.not_null) parts.push('NOT NULL');
        return parts.join(' ');
      });
      await target.query(`CREATE TABLE ${qname(SCHEMA, table)} (${columnSql.join(', ')})`);
    }

    for (const table of sourceTables) {
      const copied = await copyTable(source, target, table);
      console.log(`copied ${table}: ${copied}`);
    }

    const constraints = await getConstraints(source);
    for (const constraint of constraints) {
      const tableName = constraint.table_name.split('.')[1] || constraint.table_name;
      await target.query(
        `ALTER TABLE ${qname(SCHEMA, tableName)} ADD CONSTRAINT ${quoteIdent(constraint.name)} ${constraint.definition}`,
      );
    }

    const indexes = await getIndexes(source);
    for (const index of indexes) {
      await target.query(index.definition);
    }

    const functions = await getFunctions(source);
    for (const definition of functions) {
      await target.query(definition);
    }

    const triggers = await getTriggers(source);
    for (const definition of triggers) {
      await target.query(definition);
    }

    const views = await getViews(source);
    for (const view of views) {
      await target.query(`CREATE OR REPLACE VIEW ${qname(SCHEMA, view.table_name)} AS ${view.view_definition}`);
    }

    await target.query('COMMIT');
    console.log('migration committed');
  } catch (error) {
    await target.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await source.end();
    await target.end();
  }
}

async function verify() {
  const { source, target } = await connectBoth();
  try {
    const sourceTables = await listTables(source);
    const targetTables = await listTables(target);
    const sourceCounts = await tableCounts(source, sourceTables);
    const targetCounts = await tableCounts(target, targetTables);
    const targetMap = new Map(targetCounts.map((row) => [row.table, row.count]));

    console.log(`source tables: ${sourceTables.length}`);
    console.log(`target tables: ${targetTables.length}`);
    for (const row of sourceCounts) {
      const targetCount = targetMap.get(row.table);
      const status = targetCount === row.count ? 'OK' : 'MISMATCH';
      console.log(`${status} ${row.table}: source=${row.count} target=${targetCount}`);
    }

    const objectQueries = [
      {
        label: 'functions',
        sql: `SELECT count(*)::int AS count FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = $1`,
      },
      {
        label: 'constraints',
        sql: `SELECT count(*)::int AS count FROM pg_constraint WHERE connamespace = $1::regnamespace AND conrelid <> 0`,
      },
      {
        label: 'indexes',
        sql: `SELECT count(*)::int AS count FROM pg_index x JOIN pg_class t ON t.oid = x.indrelid JOIN pg_namespace n ON n.oid = t.relnamespace WHERE n.nspname = $1`,
      },
      {
        label: 'triggers',
        sql: `SELECT count(*)::int AS count FROM pg_trigger tr JOIN pg_class c ON c.oid = tr.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1 AND NOT tr.tgisinternal`,
      },
    ];

    for (const query of objectQueries) {
      const sourceCount = await source.query(query.sql, [SCHEMA]);
      const targetCount = await target.query(query.sql, [SCHEMA]);
      const left = sourceCount.rows[0].count;
      const right = targetCount.rows[0].count;
      const status = left === right ? 'OK' : 'MISMATCH';
      console.log(`${status} ${query.label}: source=${left} target=${right}`);
    }
  } finally {
    await source.end();
    await target.end();
  }
}

(async () => {
  if (MODE === 'inspect') return inspect();
  if (MODE === 'migrate') return migrate();
  if (MODE === 'verify') return verify();
  throw new Error(`Modo no soportado: ${MODE}`);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
