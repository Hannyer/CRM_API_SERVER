const { pool } = require('../config/db.pg');

const MENU_FIELDS = `
  id,
  parent_id as "parentId",
  code,
  name,
  description,
  icon,
  route_path as "routePath",
  section,
  sort_order as "sortOrder",
  status,
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

async function listMenus({ status = null } = {}) {
  const params = [];
  let where = '';
  if (status !== null) {
    params.push(status);
    where = `WHERE status = $1`;
  }

  const { rows } = await pool.query(
    `
    SELECT ${MENU_FIELDS}
    FROM ops.menu
    ${where}
    ORDER BY sort_order ASC, name ASC
    `,
    params
  );
  return rows;
}

async function getMenuById(menuId) {
  const { rows } = await pool.query(
    `SELECT ${MENU_FIELDS} FROM ops.menu WHERE id = $1::uuid`,
    [menuId]
  );
  return rows[0] || null;
}

async function createMenu({
  parentId = null,
  code,
  name,
  description = null,
  icon = null,
  routePath = null,
  section = null,
  sortOrder = 0,
  status = true,
}) {
  const { rows } = await pool.query(
    `
    INSERT INTO ops.menu (
      parent_id, code, name, description, icon, route_path, section, sort_order, status
    )
    VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING ${MENU_FIELDS}
    `,
    [parentId, code, name, description, icon, routePath, section, sortOrder, status]
  );
  return rows[0];
}

async function updateMenu(menuId, data) {
  const updates = [];
  const params = [];
  let i = 1;

  const map = [
    ['parentId', 'parent_id', 'uuid'],
    ['code', 'code', null],
    ['name', 'name', null],
    ['description', 'description', null],
    ['icon', 'icon', null],
    ['routePath', 'route_path', null],
    ['section', 'section', null],
    ['sortOrder', 'sort_order', 'int'],
    ['status', 'status', 'bool'],
  ];

  for (const [key, col, cast] of map) {
    if (data[key] !== undefined) {
      updates.push(`${col} = $${i++}${cast ? `::${cast}` : ''}`);
      params.push(data[key]);
    }
  }

  if (!updates.length) return getMenuById(menuId);

  updates.push('updated_at = now()');
  params.push(menuId);

  const { rows } = await pool.query(
    `
    UPDATE ops.menu
    SET ${updates.join(', ')}
    WHERE id = $${i}::uuid
    RETURNING ${MENU_FIELDS}
    `,
    params
  );
  return rows[0] || null;
}

async function deleteMenu(menuId) {
  const { rows } = await pool.query(
    `
    UPDATE ops.menu
    SET status = false, updated_at = now()
    WHERE id = $1::uuid
    RETURNING id
    `,
    [menuId]
  );
  return rows[0] || null;
}

module.exports = {
  listMenus,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
};
