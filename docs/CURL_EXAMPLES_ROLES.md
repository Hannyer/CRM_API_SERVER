# Ejemplos cURL — Roles (`/api/roles`)

## Script en DBeaver (si ya tienes columna `code`)

Ejecuta: `scripts/migrations/2026-05-26_drop_role_code_column.sql`

## Obtener IDs para asignar a usuarios

```bash
curl --location 'http://localhost:3000/api/roles/select'
```

Respuesta: `value` = UUID del rol (`roleId` en usuarios).

---

## Crear rol (POST)

```bash
curl --location 'http://localhost:3000/api/roles' \
--header 'Content-Type: application/json' \
--data '{
  "name": "Supervisor",
  "description": "Supervisión de operaciones",
  "requiresLicense": false,
  "status": true
}'
```

---

## Crear usuario con roleId (POST)

```bash
curl --location 'http://localhost:3000/api/users' \
--header 'Content-Type: application/json' \
--data '{
  "cedula": "1-2345-6789",
  "email": "conductor@ejemplo.com",
  "fullName": "Juan Conductor",
  "phone": "+506 8888-8888",
  "password": "123456",
  "roleId": "UUID-DEL-ROL-CONDUCTOR",
  "licenseExpirationDate": "2026-12-31"
}'
```

`licenseExpirationDate` es obligatorio solo si el rol tiene `requiresLicense: true` (ej. Conductor).
