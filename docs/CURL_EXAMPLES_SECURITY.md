# Seguridad — menú dinámico y permisos por rol

## 1. Ejecutar en PostgreSQL

```bash
# Archivo principal (crea tablas + seed + permisos admin)
scripts/migrations/2026-06-12_security_menu_permissions.sql
```

## Modelo (mejora sobre SQL Server legacy)

| Legacy (SQL Server) | PostgreSQL CRM | Notas |
|---------------------|----------------|-------|
| `MENU` | `ops.menu` | Catálogo de módulos (UUID, `code`, `route_path`, `section`) |
| `Permissions.CREATE/EDIT/VIEW/SEND` | `can_write`, `can_read`, `can_delete` | Read = ver/acceder; Write = crear/editar; Delete = eliminar/desactivar |
| `FK_ROLE` + `FK_MENU` | `ops.role_menu_permission` | UNIQUE (`role_id`, `menu_id`) |

## Endpoints API

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/api/security/roles/{roleId}/permissions` | Matriz de checkboxes (Leer/Escribir/Eliminar) |
| PUT | `/api/security/roles/{roleId}/permissions` | Guardar permisos |
| GET | `/api/security/menu/{roleId}` | Menú dinámico del rol (solo `canRead=true`) |
| GET | `/api/menu` | Catálogo de módulos |
| POST/PUT/DELETE | `/api/menu` | CRUD catálogo (admin) |

## CURL — permisos de un rol

```bash
# Obtener matriz
curl --location 'http://localhost:3000/api/security/roles/809e4473-9952-45a0-984c-687febcd00c1/permissions'

# Guardar (ejemplo Recepcionista: solo reservas lectura+escritura)
curl --location --request PUT 'http://localhost:3000/api/security/roles/809e4473-9952-45a0-984c-687febcd00c1/permissions' \
--header 'Content-Type: application/json' \
--data '{
  "permissions": [
    { "menuId": "UUID-MENU-BOOKINGS", "canRead": true, "canWrite": true, "canDelete": false }
  ]
}'
```

Obtenga `menuId` de `GET /api/menu` o del GET de permisos del rol.

## CURL — menú dinámico (login / sidebar)

```bash
curl --location 'http://localhost:3000/api/security/menu/18af500d-6187-4632-b206-b176e83d776e'
```

Respuesta: `items`, `sections` (agrupado), `unsectioned` (ej. Inicio).

## Frontend

- Pantalla: `/security` — Permisos de acceso por rol
- Sidebar: carga automática tras login (`GET /api/security/menu/{roleId}`)
- Administrador recibe todos los permisos al ejecutar el script SQL

## Flujo recomendado

1. Ejecutar migración SQL
2. Iniciar sesión como Administrador → ve todo el menú
3. Ir a **Seguridad → Permisos de acceso**
4. Elegir rol (Operador, Recepcionista, etc.) y marcar Leer / Escribir / Eliminar
5. Guardar → usuarios con ese rol verán solo los módulos con **Leer** activo
