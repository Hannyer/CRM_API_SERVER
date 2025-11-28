# Migración: Sistema de Capacidad y Reservas para Actividades

## Resumen de Cambios

Esta migración agrega un sistema completo de gestión de capacidad y reservas para las actividades turísticas, permitiendo:

1. **Inserción masiva de horarios** con validación de solapamientos
2. **Capacidad por horario** (no por día)
3. **Conteo de asistentes** por horario
4. **Prevención de sobreventa** con bloqueo transaccional
5. **Consultas de disponibilidad** en tiempo real

## Cambios en la Base de Datos

### 1. Modificaciones a la tabla `activity_schedule`

Se agregan dos nuevas columnas:

- `capacity` (INTEGER): Capacidad máxima de personas para el horario
- `booked_count` (INTEGER): Cantidad de personas que ya han reservado

**Constraints agregados:**
- `check_capacity_limit`: Asegura que `booked_count <= capacity`
- `check_capacity_positive`: Asegura que ambos valores sean >= 0

### 2. Funciones SQL creadas

#### `ops.check_schedule_overlaps`
Detecta horarios que se solapan con un horario propuesto.

#### `ops.bulk_create_schedules`
Crea múltiples horarios para una actividad en un rango de fechas, validando solapamientos.

#### `ops.add_attendees_to_schedule`
Suma asistentes a un horario con bloqueo `FOR UPDATE` para prevenir sobreventa.

#### `ops.get_schedule_availability`
Consulta horarios disponibles con información de capacidad y disponibilidad.

## Instrucciones de Migración

### Paso 1: Hacer backup de la base de datos

```bash
pg_dump -U usuario -d nombre_base_datos > backup_antes_capacity_migration.sql
```

### Paso 2: Ejecutar el script de migración

```bash
psql -U usuario -d nombre_base_datos -f scripts/migrate_activity_schedule_capacity.sql
```

### Paso 3: Verificar la migración

```sql
-- Verificar que las columnas fueron agregadas
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'ops' 
  AND table_name = 'activity_schedule'
  AND column_name IN ('capacity', 'booked_count');

-- Verificar que las funciones fueron creadas
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'ops'
  AND routine_name IN (
    'check_schedule_overlaps',
    'bulk_create_schedules',
    'add_attendees_to_schedule',
    'get_schedule_availability'
  );
```

## Nuevos Endpoints de la API

### 1. Inserción masiva de horarios

**POST** `/api/activities/:activityId/schedules/bulk`

**Request Body:**
```json
{
  "startDate": "2024-03-01",
  "endDate": "2024-03-10",
  "timeSlots": [
    {
      "startTime": "08:00",
      "endTime": "11:00",
      "capacity": 20
    },
    {
      "startTime": "13:00",
      "endTime": "16:00",
      "capacity": 15
    }
  ],
  "validateOverlaps": true
}
```

**Response (éxito):**
```json
{
  "success": true,
  "createdCount": 20,
  "message": "Se crearon 20 horarios exitosamente"
}
```

**Response (conflictos):**
```json
{
  "success": false,
  "error": "SCHEDULE_CONFLICTS",
  "message": "Se encontraron conflictos de horarios. No se insertaron registros.",
  "conflicts": [
    {
      "date": "2024-03-05",
      "startTime": "08:00",
      "endTime": "11:00",
      "conflictId": "uuid-del-conflicto",
      "conflictStart": "2024-03-05T09:00:00Z",
      "conflictEnd": "2024-03-05T12:00:00Z",
      "error": "SCHEDULE_OVERLAP"
    }
  ]
}
```

### 2. Sumar asistentes a un horario

**POST** `/api/activities/schedules/:scheduleId/attendees`

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response (éxito):**
```json
{
  "success": true,
  "message": "Se agregaron 3 asistentes exitosamente",
  "scheduleId": "uuid-del-horario",
  "bookedCount": 5,
  "capacity": 20,
  "available": 15
}
```

**Response (capacidad excedida):**
```json
{
  "success": false,
  "error": "CAPACITY_EXCEEDED",
  "message": "No hay suficiente capacidad. Disponible: 2, Solicitado: 3",
  "currentBooked": 18,
  "capacity": 20,
  "available": 2,
  "requested": 3
}
```

### 3. Consultar disponibilidad

**GET** `/api/activities/schedules/availability?activityId=uuid&startDate=2024-03-01&endDate=2024-03-10`

**Response:**
```json
[
  {
    "scheduleId": "uuid",
    "activityId": "uuid",
    "activityTitle": "Tour por la ciudad",
    "scheduledDate": "2024-03-01",
    "startTime": "08:00:00",
    "endTime": "11:00:00",
    "capacity": 20,
    "bookedCount": 5,
    "availableSpots": 15,
    "status": true
  }
]
```

### 4. Horarios disponibles por día

**GET** `/api/activities/:activityId/schedules/available?date=2024-03-15`

**Response:**
```json
[
  {
    "id": "uuid",
    "activityId": "uuid",
    "scheduledStart": "2024-03-15T08:00:00Z",
    "scheduledEnd": "2024-03-15T11:00:00Z",
    "capacity": 20,
    "bookedCount": 5,
    "availableSpots": 15,
    "status": true
  }
]
```

## Ejemplos de Uso

### Ejemplo 1: Crear horarios para una semana

```javascript
// Crear horarios de lunes a viernes, 2 veces al día
const response = await fetch('/api/activities/activity-uuid/schedules/bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    startDate: '2024-03-01',
    endDate: '2024-03-05',
    timeSlots: [
      { startTime: '08:00', endTime: '11:00', capacity: 20 },
      { startTime: '13:00', endTime: '16:00', capacity: 15 }
    ],
    validateOverlaps: true
  })
});
```

### Ejemplo 2: Reservar 3 personas en un horario

```javascript
const response = await fetch('/api/activities/schedules/schedule-uuid/attendees', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    quantity: 3
  })
});

if (response.status === 409) {
  const error = await response.json();
  console.log('Capacidad excedida:', error.message);
  console.log('Disponible:', error.details.available);
}
```

### Ejemplo 3: Consultar disponibilidad de una actividad

```javascript
const response = await fetch(
  '/api/activities/schedules/availability?activityId=activity-uuid&startDate=2024-03-01&endDate=2024-03-10'
);
const availability = await response.json();

availability.forEach(schedule => {
  console.log(`${schedule.scheduledDate} ${schedule.startTime}: ${schedule.availableSpots} espacios disponibles`);
});
```

## Notas Importantes

1. **Validación de solapamientos**: La función `bulk_create_schedules` valida que no haya solapamientos antes de insertar. Si encuentra conflictos, no inserta nada y devuelve la lista de conflictos.

2. **Prevención de sobreventa**: La función `add_attendees_to_schedule` usa `FOR UPDATE` para bloquear el registro durante la transacción, evitando condiciones de carrera.

3. **Capacidad por horario**: Cada horario tiene su propia capacidad independiente. No hay capacidad global por día.

4. **Sin datos personales**: El sistema solo cuenta asistentes, no almacena información personal de cada uno.

5. **Horarios duplicados**: El sistema previene la creación de horarios duplicados o solapados para la misma actividad.

## Rollback (si es necesario)

Si necesitas revertir los cambios:

```sql
-- Eliminar funciones
DROP FUNCTION IF EXISTS ops.get_schedule_availability(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS ops.add_attendees_to_schedule(UUID, INTEGER);
DROP FUNCTION IF EXISTS ops.bulk_create_schedules(UUID, DATE, DATE, JSONB, BOOLEAN);
DROP FUNCTION IF EXISTS ops.check_schedule_overlaps(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID);

-- Eliminar constraints
ALTER TABLE ops.activity_schedule DROP CONSTRAINT IF EXISTS check_capacity_positive;
ALTER TABLE ops.activity_schedule DROP CONSTRAINT IF EXISTS check_capacity_limit;

-- Eliminar columnas (¡CUIDADO! Esto eliminará los datos)
-- ALTER TABLE ops.activity_schedule DROP COLUMN IF EXISTS booked_count;
-- ALTER TABLE ops.activity_schedule DROP COLUMN IF EXISTS capacity;
```

## Soporte

Para más información o problemas, consulta la documentación de la API o contacta al equipo de desarrollo.

