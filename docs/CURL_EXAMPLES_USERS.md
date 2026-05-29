# Usuarios (`/api/users`)

## Migraciones (DBeaver)

1. `scripts/migrations/2026-05-27_guide_language_app_user.sql` — idiomas de guías en `app_user`
2. Ver también scripts de roles si aún no los ejecutó

## Roles e idiomas

| Campo / endpoint | Uso |
|------------------|-----|
| `GET /api/roles/select` | `requiresLanguages: true` → rol Guía |
| `GET /api/languages` | Catálogo para `languageIds` |
| `languageIds` | Obligatorio al crear usuario Guía |
| `languages` | Solo lectura en respuestas GET |

Detalle: `docs/CURL_EXAMPLES_USER_GUIDE_LANGUAGES.md`

## Campos obligatorios (POST)

| Campo | Obligatorio | Notas |
|-------|-------------|--------|
| `cedula` | Sí | Única |
| `email` | Sí | Único |
| `fullName` | Sí | |
| `phone` | Sí | |
| `password` | Sí | |
| `roleId` | Sí | UUID de `ops.role` |
| `licenseExpirationDate` | Condicional | Si `requiresLicense` del rol |
| `languageIds` | Condicional | **Obligatorio si rol Guía** (`requiresLanguages`) |
| `speaksEnglish` | No | Default `false` |
| `status` | No | Default `true` |

## Crear usuario Guía

```bash
curl -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "cedula": "2-3456-7890",
    "email": "guia@example.com",
    "fullName": "María Guía",
    "phone": "+506 7777-7777",
    "password": "123456",
    "roleId": "UUID-ROL-GUIA",
    "languageIds": ["UUID-ES", "UUID-EN"]
  }'
```
