# Ejemplos de CURL para Bookings API

## Base URL
```
http://localhost:3000/api/bookings
```

---

## 1. Crear una Reserva (POST)

### Ejemplo 1: Reserva básica con desglose de personas
```bash
curl --location 'http://localhost:3000/api/bookings' \
--header 'Content-Type: application/json' \
--data '{
  "activityScheduleId": "123e4567-e89b-12d3-a456-426614174000",
  "numberOfPeople": 5,
  "adultCount": 3,
  "childCount": 2,
  "seniorCount": 0,
  "customerName": "Juan Pérez",
  "customerEmail": "juan.perez@example.com",
  "customerPhone": "+506 8888-8888",
  "status": "pending"
}'
```

### Ejemplo 2: Reserva con compañía y comisión automática
```bash
curl --location 'http://localhost:3000/api/bookings' \
--header 'Content-Type: application/json' \
--data '{
  "activityScheduleId": "123e4567-e89b-12d3-a456-426614174000",
  "companyId": "223e4567-e89b-12d3-a456-426614174001",
  "numberOfPeople": 4,
  "adultCount": 2,
  "childCount": 1,
  "seniorCount": 1,
  "customerName": "María González",
  "customerEmail": "maria.gonzalez@example.com",
  "customerPhone": "+506 7777-7777",
  "status": "confirmed"
}'
```

### Ejemplo 3: Reserva con transporte y comisión manual
```bash
curl --location 'http://localhost:3000/api/bookings' \
--header 'Content-Type: application/json' \
--data '{
  "activityScheduleId": "123e4567-e89b-12d3-a456-426614174000",
  "companyId": "223e4567-e89b-12d3-a456-426614174001",
  "transport": true,
  "numberOfPeople": 6,
  "adultCount": 4,
  "childCount": 2,
  "seniorCount": 0,
  "passengerCount": 4,
  "commissionPercentage": 15.5,
  "customerName": "Carlos Rodríguez",
  "customerEmail": "carlos.rodriguez@example.com",
  "customerPhone": "+506 6666-6666",
  "status": "pending"
}'
```

### Ejemplo 4: Reserva solo con adultos
```bash
curl --location 'http://localhost:3000/api/bookings' \
--header 'Content-Type: application/json' \
--data '{
  "activityScheduleId": "123e4567-e89b-12d3-a456-426614174000",
  "numberOfPeople": 3,
  "adultCount": 3,
  "childCount": 0,
  "seniorCount": 0,
  "customerName": "Ana Martínez",
  "customerEmail": "ana.martinez@example.com",
  "status": "pending"
}'
```

### Ejemplo 5: Reserva con adultos mayores
```bash
curl --location 'http://localhost:3000/api/bookings' \
--header 'Content-Type: application/json' \
--data '{
  "activityScheduleId": "123e4567-e89b-12d3-a456-426614174000",
  "numberOfPeople": 4,
  "adultCount": 1,
  "childCount": 0,
  "seniorCount": 3,
  "customerName": "Roberto Sánchez",
  "customerEmail": "roberto.sanchez@example.com",
  "customerPhone": "+506 5555-5555",
  "status": "confirmed"
}'
```

---

## 2. Listar Reservas (GET)

### Ejemplo 1: Listar todas las reservas (paginado)
```bash
curl --location 'http://localhost:3000/api/bookings?page=1&limit=10'
```

### Ejemplo 2: Filtrar por estado
```bash
curl --location 'http://localhost:3000/api/bookings?status=confirmed&page=1&limit=10'
```

### Ejemplo 3: Filtrar por planeación específica
```bash
curl --location 'http://localhost:3000/api/bookings?activityScheduleId=123e4567-e89b-12d3-a456-426614174000'
```

---

## 3. Obtener una Reserva por ID (GET)

```bash
curl --location 'http://localhost:3000/api/bookings/123e4567-e89b-12d3-a456-426614174000'
```

---

## 4. Actualizar una Reserva (PUT)

### Ejemplo 1: Actualizar desglose de personas
```bash
curl --location --request PUT 'http://localhost:3000/api/bookings/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
  "numberOfPeople": 6,
  "adultCount": 3,
  "childCount": 2,
  "seniorCount": 1,
  "customerName": "Juan Pérez Actualizado"
}'
```

### Ejemplo 2: Actualizar solo adultos y niños
```bash
curl --location --request PUT 'http://localhost:3000/api/bookings/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
  "numberOfPeople": 5,
  "adultCount": 3,
  "childCount": 2,
  "seniorCount": 0
}'
```

### Ejemplo 3: Actualizar estado y desglose
```bash
curl --location --request PUT 'http://localhost:3000/api/bookings/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
  "status": "confirmed",
  "numberOfPeople": 4,
  "adultCount": 2,
  "childCount": 1,
  "seniorCount": 1
}'
```

---

## 5. Cancelar una Reserva (PUT)

```bash
curl --location --request PUT 'http://localhost:3000/api/bookings/123e4567-e89b-12d3-a456-426614174000/cancel'
```

---

## 6. Obtener Fechas Disponibles para una Actividad (GET)

```bash
curl --location 'http://localhost:3000/api/bookings/activities/123e4567-e89b-12d3-a456-426614174000/schedules'
```

---

## 7. Validar Disponibilidad de Espacios (GET)

```bash
curl --location 'http://localhost:3000/api/bookings/schedules/123e4567-e89b-12d3-a456-426614174000/availability'
```

---

## Notas Importantes

### Validaciones de Campos de Personas

1. **numberOfPeople** es obligatorio y debe ser mayor a 0
2. **adultCount**, **childCount**, **seniorCount** son opcionales pero:
   - No pueden ser negativos
   - La suma de `adultCount + childCount + seniorCount` DEBE ser igual a `numberOfPeople`
   - Si no se proporcionan, por defecto son 0

### Ejemplos de Validación

✅ **Válido:**
```json
{
  "numberOfPeople": 5,
  "adultCount": 3,
  "childCount": 2,
  "seniorCount": 0
}
```

✅ **Válido (solo adultos):**
```json
{
  "numberOfPeople": 3,
  "adultCount": 3,
  "childCount": 0,
  "seniorCount": 0
}
```

❌ **Inválido (suma no coincide):**
```json
{
  "numberOfPeople": 5,
  "adultCount": 3,
  "childCount": 1,
  "seniorCount": 0
}
// Error: La suma (4) no es igual a numberOfPeople (5)
```

❌ **Inválido (valores negativos):**
```json
{
  "numberOfPeople": 3,
  "adultCount": -1,
  "childCount": 2,
  "seniorCount": 2
}
// Error: adultCount no puede ser negativo
```

---

## Respuestas de Ejemplo

### Respuesta al crear una reserva (201 Created):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "activityScheduleId": "223e4567-e89b-12d3-a456-426614174001",
  "companyId": null,
  "transport": false,
  "numberOfPeople": 5,
  "adultCount": 3,
  "childCount": 2,
  "seniorCount": 0,
  "passengerCount": null,
  "commissionPercentage": 0,
  "customerName": "Juan Pérez",
  "customerEmail": "juan.perez@example.com",
  "customerPhone": "+506 8888-8888",
  "status": "pending",
  "createdAt": "2024-01-26T10:00:00.000Z",
  "updatedAt": "2024-01-26T10:00:00.000Z",
  "createdBy": null
}
```

### Respuesta al listar reservas (200 OK):
```json
{
  "items": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "activityScheduleId": "223e4567-e89b-12d3-a456-426614174001",
      "numberOfPeople": 5,
      "adultCount": 3,
      "childCount": 2,
      "seniorCount": 0,
      "customerName": "Juan Pérez",
      "status": "pending",
      "activityTitle": "Tour Canopy - Grupo 1",
      "scheduledStart": "2024-12-25T08:00:00Z",
      "scheduledEnd": "2024-12-25T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## Importar a Postman

1. Copia cualquiera de los comandos curl anteriores
2. En Postman, ve a **Import** → **Raw text**
3. Pega el comando curl
4. Postman convertirá automáticamente el curl a una solicitud HTTP

### Variables de Entorno en Postman

Para facilitar el uso, puedes crear variables de entorno en Postman:

- `base_url`: `http://localhost:3000`
- `booking_id`: `123e4567-e89b-12d3-a456-426614174000`
- `activity_schedule_id`: `223e4567-e89b-12d3-a456-426614174001`
- `company_id`: `323e4567-e89b-12d3-a456-426614174002`

Luego usa: `{{base_url}}/api/bookings`
