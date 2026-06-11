# Usuarios (`/api/users`)

## Migraciones (DBeaver)

1. `scripts/migrations/2026-05-27_guide_language_app_user.sql` — idiomas de guías en `app_user`
2. `scripts/migrations/2026-06-10_role_conductor_guia_flags_by_id.sql` — flags `requires_license` / `requires_languages` por ID de rol

## IDs de roles (validación en API)

| Rol | `roleId` | Campo obligatorio |
|-----|----------|-------------------|
| Conductor | `b07fe1a3-40e2-4cb8-9fd7-ff6df2a2dba3` | `licenseExpirationDate` (YYYY-MM-DD) |
| Guía | `9d3372fa-7180-4f04-9727-374e9b513d53` | `languageIds` (≥ 1 idioma de `ops.language`) |
| Recepcionista | `809e4473-9952-45a0-984c-687febcd00c1` | — |
| Operador | `0e278751-4d4b-489a-af97-298d413d7985` | — |
| Administrador | `18af500d-6187-4632-b206-b176e83d776e` | — |

`GET /api/roles/select` devuelve `requiresLicense` y `requiresLanguages` para que el front muestre/oculte campos.

## Roles e idiomas

| Campo / endpoint | Uso |
|------------------|-----|
| `GET /api/roles/select` | `requiresLicense` → Conductor; `requiresLanguages` → Guía |
| `GET /api/languages` | Catálogo para `languageIds` |
| `languageIds` | Obligatorio al crear/actualizar usuario Guía |
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

## Crear usuario Conductor

```bash
curl -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "cedula": "1-1111-1111",
    "email": "conductor@example.com",
    "fullName": "Pedro Conductor",
    "phone": "+506 6666-6666",
    "password": "123456",
    "roleId": "b07fe1a3-40e2-4cb8-9fd7-ff6df2a2dba3",
    "licenseExpirationDate": "2027-06-30"
  }'
```

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
    "roleId": "9d3372fa-7180-4f04-9727-374e9b513d53",
    "languageIds": ["UUID-ES", "UUID-EN"]
  }'
```
