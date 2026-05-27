# Usuarios (`/api/users`)

## Migración en DBeaver

1. `scripts/migrations/2026-05-26_drop_role_code_column.sql` (quita `code` de roles)
2. Si aún no migraste usuarios: `scripts/migrations/2026-05-26_migrate_app_user_to_role_fk.sql`

## Roles

`GET /api/roles/select` → `value` es el **UUID** (`roleId`).

## Campos obligatorios (POST)

| Campo | Obligatorio | Notas |
|-------|-------------|--------|
| `cedula` | Sí | Única |
| `email` | Sí | Único, formato email |
| `fullName` | Sí | |
| `phone` | Sí | |
| `password` | Sí | Se guarda encriptado |
| `roleId` | Sí | UUID de `ops.role` |
| `licenseExpirationDate` | Condicional | Obligatorio si el rol tiene `requiresLicense: true` |
| `speaksEnglish` | No | Default `false` |
| `status` | No | Default `true` |

## Crear conductor

Obtén el UUID del rol "Conductor" con `/api/roles/select`, luego:

```bash
curl -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "cedula": "1-2345-6789",
    "email": "conductor@example.com",
    "fullName": "Juan Pérez",
    "phone": "+506 8888-8888",
    "password": "123456",
    "roleId": "UUID-DEL-ROL-CONDUCTOR",
    "licenseExpirationDate": "2026-12-31",
    "speaksEnglish": true
  }'
```
