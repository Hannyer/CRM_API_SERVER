const { pool } = require('../config/db.pg');

async function getPermissionsMatrixByRoleId(roleId) {
  const { rows } = await pool.query(
    `
    SELECT
      m.id as "menuId",
      m.parent_id as "parentId",
      m.code,
      m.name,
      m.description,
      m.icon,
      m.route_path as "routePath",
      m.section,
      m.sort_order as "sortOrder",
      m.status as "menuStatus",
      COALESCE(p.can_read, false) as "canRead",
      COALESCE(p.can_write, false) as "canWrite",
      COALESCE(p.can_delete, false) as "canDelete",
      COALESCE(p.status, true) as "permissionStatus"
    FROM ops.menu m
    LEFT JOIN ops.role_menu_permission p
      ON p.menu_id = m.id AND p.role_id = $1::uuid
    WHERE m.status = true
    ORDER BY m.sort_order ASC, m.name ASC
    `,
    [roleId]
  );
  return rows;
}

async function getMenuForRole(roleId) {
  const { rows } = await pool.query(
    `
    SELECT
      m.id,
      m.parent_id as "parentId",
      m.code,
      m.name,
      m.icon,
      m.route_path as "routePath",
      m.section,
      m.sort_order as "sortOrder",
      p.can_read as "canRead",
      p.can_write as "canWrite",
      p.can_delete as "canDelete"
    FROM ops.menu m
    INNER JOIN ops.role_menu_permission p
      ON p.menu_id = m.id
      AND p.role_id = $1::uuid
      AND p.status = true
      AND p.can_read = true
    WHERE m.status = true
      AND m.route_path IS NOT NULL
    ORDER BY m.sort_order ASC, m.name ASC
    `,
    [roleId]
  );
  return rows;
}

async function upsertRolePermissions(roleId, permissions = []) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const item of permissions) {
      const { menuId, canRead = false, canWrite = false, canDelete = false, status = true } =
        item;

      await client.query(
        `
        INSERT INTO ops.role_menu_permission (
          role_id, menu_id, can_read, can_write, can_delete, status
        )
        VALUES ($1::uuid, $2::uuid, $3::bool, $4::bool, $5::bool, $6::bool)
        ON CONFLICT (role_id, menu_id) DO UPDATE SET
          can_read = EXCLUDED.can_read,
          can_write = EXCLUDED.can_write,
          can_delete = EXCLUDED.can_delete,
          status = EXCLUDED.status,
          updated_at = now()
        `,
        [roleId, menuId, !!canRead, !!canWrite, !!canDelete, !!status]
      );
    }

    await client.query('COMMIT');
    return getPermissionsMatrixByRoleId(roleId);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function grantFullPermissionsToRole(roleId) {
  const { rows: menus } = await pool.query(
    `SELECT id FROM ops.menu WHERE status = true`
  );

  return upsertRolePermissions(
    roleId,
    menus.map((m) => ({
      menuId: m.id,
      canRead: true,
      canWrite: true,
      canDelete: true,
      status: true,
    }))
  );
}

module.exports = {
  getPermissionsMatrixByRoleId,
  getMenuForRole,
  upsertRolePermissions,
  grantFullPermissionsToRole,
};
