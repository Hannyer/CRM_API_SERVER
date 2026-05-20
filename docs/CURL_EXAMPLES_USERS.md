# Usuarios (`/api/users`)

## Migración de tabla existente

```bash
psql -U <usuario> -d <base> -f scripts/alter_app_user_extend.sql
```

## Enum de roles (`ops.app_user_role`)

| Valor API | Etiqueta |
|-----------|----------|
| `admin` | Administrador |
| `driver` | Conductor |
| `receptionist` | Recepcionista |
| `operator` | Operador |
| `guide` | Guía |

`GET /api/users/roles` devuelve la lista con `value` y `label`.

## Campos obligatorios (POST)

| Campo | Obligatorio | Notas |
|-------|-------------|--------|
| `cedula` | Sí | Única |
| `email` | Sí | Único, formato email |
| `fullName` | Sí | |
| `phone` | Sí | |
| `password` | Sí | Se guarda encriptado |
| `role` | Sí | Uno del enum |
| `licenseExpirationDate` | Condicional | **Obligatorio si `role` = `driver`** (`YYYY-MM-DD`) |
| `speaksEnglish` | No | Default `false` |
| `status` | No | Default `true` |

## Crear conductor

```bash
curl -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "cedula": "1-2345-6789",
    "email": "conductor@example.com",
    "fullName": "Juan Pérez",
    "phone": "+506 8888-8888",
    "password": "123456",
    "role": "driver",
    "licenseExpirationDate": "2026-12-31",
    "speaksEnglish": true
  }'
```
