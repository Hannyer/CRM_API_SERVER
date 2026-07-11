require('dotenv').config();
const { Client } = require('pg');

(async () => {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { require: true, rejectUnauthorized: false },
    });
    await client.connect();

    console.log('--- REPAIRING DATABASE SCHEMA ---');
    
    // 1. Rename role to role_id if role exists and role_id does not
    const { rows: columns } = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'ops' AND table_name = 'app_user';`
    );
    const colNames = columns.map(c => c.column_name);
    
    if (colNames.includes('role') && !colNames.includes('role_id')) {
      console.log('Renaming role to role_id...');
      await client.query('ALTER TABLE ops.app_user RENAME COLUMN role TO role_id;');
    }
    
    // 2. Add other columns if they do not exist
    console.log('Adding missing columns...');
    await client.query(`
      ALTER TABLE ops.app_user ADD COLUMN IF NOT EXISTS cedula VARCHAR(20);
      ALTER TABLE ops.app_user ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
      ALTER TABLE ops.app_user ADD COLUMN IF NOT EXISTS speaks_english BOOLEAN NOT NULL DEFAULT false;
    `);

    // 3. Set default values for empty fields for existing users
    console.log('Setting defaults for existing users...');
    await client.query(`
      UPDATE ops.app_user SET cedula = 'PENDIENTE-' || LEFT(id::text, 8) WHERE cedula IS NULL;
      UPDATE ops.app_user SET phone = '00000000' WHERE phone IS NULL;
    `);

    // 4. Set NOT NULL constraint on cedula and phone
    await client.query(`
      ALTER TABLE ops.app_user ALTER COLUMN cedula SET NOT NULL;
      ALTER TABLE ops.app_user ALTER COLUMN phone SET NOT NULL;
    `);

    // 5. Fix orphaned role_id references
    console.log('Fixing orphaned role_id references...');
    const { rows: adminRole } = await client.query("SELECT id FROM ops.role WHERE name = 'Administrador' LIMIT 1");
    if (adminRole.length > 0) {
      const adminRoleId = adminRole[0].id;
      await client.query(
        `UPDATE ops.app_user SET role_id = $1 WHERE role_id NOT IN (SELECT id FROM ops.role);`,
        [adminRoleId]
      );
    }

    // 6. Add foreign key constraint if not exists
    console.log('Adding FK constraint...');
    await client.query(`
      ALTER TABLE ops.app_user DROP CONSTRAINT IF EXISTS app_user_role_id_fk;
      ALTER TABLE ops.app_user ADD CONSTRAINT app_user_role_id_fk FOREIGN KEY (role_id) REFERENCES ops.role(id);
    `);

    console.log('✅ DATABASE REPAIRED SUCCESSFULLY!');
    await client.end();
    
    // Delete this script after successful execution
    const fs = require('fs');
    fs.unlinkSync(__filename);
    console.log('Script deleted.');
  } catch (e) {
    console.error('Error during repair:', e);
  }
})();
