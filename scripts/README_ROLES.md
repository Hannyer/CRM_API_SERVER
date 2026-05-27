# Roles — tabla `ops.role`

Los usuarios se relacionan por **`app_user.role_id`** → **`ops.role.id`**. No existe columna `code`.

## Migración en DBeaver (tabla ya creada con `code`)

**Orden importante:**

1. Si `app_user` aún tiene columna `role` (enum):  
   `scripts/migrations/2026-05-26_migrate_app_user_to_role_fk.sql`
2. Luego quitar `code` de roles:  
   `scripts/migrations/2026-05-26_drop_role_code_column.sql`

Ese script:
- Agrega `requires_license` (para regla de licencia de conductores)
- Elimina `code` y sus índices/restricciones
- Deja `name` como único

## Instalación nueva

```text
scripts/create_roles_table.sql
scripts/migrations/2026-05-26_migrate_app_user_to_role_fk.sql
```

## API usuarios

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `roleId` | uuid | Obligatorio al crear; FK a `ops.role.id` |
| `roleName` | string | Solo lectura en respuestas |
| `requiresLicense` | boolean | En rol; si true, exige `licenseExpirationDate` |

Config `ROLCLIENTE`: debe guardar el **UUID** del rol cliente (no un código).
