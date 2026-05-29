# Usuarios Guía — idiomas (`guide_language` + `language`)

## Migración en DBeaver

Ejecutar: `scripts/migrations/2026-05-27_guide_language_app_user.sql`

- Agrega `app_user_id` en `ops.guide_language` (FK a `ops.app_user`)
- Agrega `requires_languages` en `ops.role` (true para **Guía**)

## Flujo

1. Listar idiomas: `GET /api/languages`
2. Listar roles: `GET /api/roles/select` → buscar rol con `requiresLanguages: true`
3. Crear usuario Guía con `languageIds` (UUIDs de `ops.language`)

Los idiomas se guardan en `ops.guide_language` (`app_user_id`, `language_id`).

---

## Listar idiomas disponibles

```bash
curl --location 'http://localhost:3000/api/languages?limit=100&status=true'
```

---

## Crear usuario Guía (POST)

```bash
curl --location 'http://localhost:3000/api/users' \
--header 'Content-Type: application/json' \
--data '{
  "cedula": "2-3456-7890",
  "email": "guia@ejemplo.com",
  "fullName": "María Guía",
  "phone": "+506 7777-7777",
  "password": "123456",
  "roleId": "UUID-ROL-GUIA",
  "languageIds": [
    "UUID-IDIOMA-ES",
    "UUID-IDIOMA-EN"
  ],
  "speaksEnglish": true,
  "status": true
}'
```

**Errores comunes**

| Código | Motivo |
|--------|--------|
| 400 `GUIDE_LANGUAGES_REQUIRED` | Falta `languageIds` con rol Guía |
| 400 `INVALID_LANGUAGE_IDS` | UUID inválido o idioma inactivo/inexistente |
| 400 `GUIDE_LANGUAGES_NOT_ALLOWED` | `languageIds` enviado con rol que no es Guía |

---

## Actualizar idiomas del guía (PUT)

```bash
curl --location --request PUT 'http://localhost:3000/api/users/UUID-USUARIO' \
--header 'Content-Type: application/json' \
--data '{
  "languageIds": [
    "UUID-IDIOMA-ES",
    "UUID-IDIOMA-FR"
  ]
}'
```

Al cambiar `roleId` a un rol que **no** es Guía, se eliminan automáticamente sus filas en `guide_language`.

---

## Respuesta de usuario (ejemplo)

```json
{
  "id": "...",
  "fullName": "María Guía",
  "roleId": "...",
  "roleName": "Guía",
  "roleRequiresLanguages": true,
  "languages": [
    { "id": "...", "code": "es", "name": "Español" },
    { "id": "...", "code": "en", "name": "English" }
  ]
}
```

## Swagger

`http://localhost:3000/docs` → **Users** (campos `languageIds`, `languages`).
