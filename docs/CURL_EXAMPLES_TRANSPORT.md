# Ejemplos cURL — Transporte (`/api/transport`)

## Crear transporte con documentación vehicular

```bash
curl -X POST "http://localhost:3000/api/transport" \
  -H "Content-Type: application/json" \
  -d '{
    "capacity": 20,
    "model": "Toyota Hiace 2023",
    "licensePlate": "ABC-123",
    "circulationPermitExpirationDate": "2026-12-31",
    "ctpExpirationDate": "2026-06-30"
  }'
```

## Actualizar placa y fechas de vencimiento

```bash
curl -X PUT "http://localhost:3000/api/transport/{id}" \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "XYZ-789",
    "circulationPermitExpirationDate": "2027-01-15",
    "ctpExpirationDate": "2027-01-15"
  }'
```

## Listar transportes disponibles

```bash
curl "http://localhost:3000/api/transport/available?page=1&limit=10"
```

### Campos obligatorios en POST

| Campo API | Tipo | Descripción |
|-----------|------|-------------|
| `capacity` | integer | Capacidad de pasajeros (> 0) |
| `model` | string | Modelo del vehículo |
| `licensePlate` | string (máx. 20) | Placa del vehículo |
| `circulationPermitExpirationDate` | string `YYYY-MM-DD` | Vencimiento del permiso de circulación |
| `ctpExpirationDate` | string `YYYY-MM-DD` | Vencimiento del CTP |

En **PUT**, `licensePlate`, `circulationPermitExpirationDate` y `ctpExpirationDate` también son obligatorios en cada solicitud.

`licensePlate` debe ser **única** en el sistema (no distingue mayúsculas/minúsculas). Si ya existe, la API responde **409** con el mensaje: `Ya existe un transporte registrado con esa placa`.
