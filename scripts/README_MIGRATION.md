# Migración: Separación de Actividades y Planeaciones

## Resumen de Cambios

Esta migración separa las actividades de sus planeaciones (fechas/horas), permitiendo que una actividad tenga múltiples planeaciones.

### Cambios en la Base de Datos

1. **Nueva tabla `activity_schedule`**: Almacena múltiples planeaciones por actividad
   - `id`: UUID (PK)
   - `activity_id`: UUID (FK a activity)
   - `scheduled_start`: TIMESTAMPTZ
   - `scheduled_end`: TIMESTAMPTZ
   - `status`: BOOLEAN (para activar/inactivar planeaciones)

2. **Modificaciones en `activity`**:
   - Se agrega campo `status`: BOOLEAN (para activar/inactivar actividades)
   - Se eliminan `scheduled_start` y `scheduled_end` (movidos a activity_schedule)

### Instrucciones de Migración

1. **Hacer backup de la base de datos** antes de ejecutar la migración:
   ```bash
   pg_dump -U usuario -d nombre_base_datos > backup_antes_migracion.sql
   ```

2. **Ejecutar el script de migración**:
   ```bash
   psql -U usuario -d nombre_base_datos -f scripts/migrate_activity_schedule.sql
   ```

3. **Verificar la migración**:
   - Verificar que los datos se migraron correctamente:
     ```sql
     SELECT COUNT(*) FROM ops.activity_schedule;
     SELECT COUNT(*) FROM ops.activity;
     ```
   - Verificar que las actividades tienen sus planeaciones:
     ```sql
     SELECT a.id, a.title, COUNT(s.id) as schedules_count
     FROM ops.activity a
     LEFT JOIN ops.activity_schedule s ON s.activity_id = a.id
     GROUP BY a.id, a.title;
     ```

4. **Descomentar las líneas de eliminación de columnas** (después de verificar):
   - Abrir `scripts/migrate_activity_schedule.sql`
   - Descomentar las líneas que eliminan `scheduled_start` y `scheduled_end`:
     ```sql
     ALTER TABLE ops.activity DROP COLUMN IF EXISTS scheduled_start;
     ALTER TABLE ops.activity DROP COLUMN IF EXISTS scheduled_end;
     ```
   - Ejecutar nuevamente solo esas líneas

### Cambios en la API

#### Nuevos Endpoints

**Actividades:**
- `PUT /api/activities/:id/toggle-status` - Activar/inactivar actividad

**Planeaciones:**
- `GET /api/activities/:activityId/schedules` - Listar planeaciones de una actividad
- `POST /api/activities/:activityId/schedules` - Crear nueva planeación
- `GET /api/activities/schedules/:scheduleId` - Obtener planeación por ID
- `PUT /api/activities/schedules/:scheduleId` - Actualizar planeación
- `PUT /api/activities/schedules/:scheduleId/toggle-status` - Activar/inactivar planeación
- `DELETE /api/activities/schedules/:scheduleId` - Eliminar planeación (soft delete)

#### Cambios en Endpoints Existentes

- `POST /api/activities` - Ya no requiere `start` y `end`, son opcionales para crear la primera planeación
- `GET /api/activities/:id` - Ahora incluye un array `schedules` con todas las planeaciones
- `GET /api/activities` - Ahora incluye `schedulesCount` y `status`

### Ejemplo de Uso

**Crear una actividad:**
```json
POST /api/activities
{
  "activityTypeId": "uuid-del-tipo",
  "title": "Tour por la ciudad",
  "partySize": 20,
  "adultPrice": 50.00,
  "childPrice": 25.00,
  "seniorPrice": 40.00,
  "status": true,
  "languageIds": ["uuid-idioma-1", "uuid-idioma-2"],
  "scheduledStart": "2024-12-25T10:00:00Z",
  "scheduledEnd": "2024-12-25T14:00:00Z"
}
```

**Agregar una planeación adicional:**
```json
POST /api/activities/{activityId}/schedules
{
  "scheduledStart": "2024-12-26T10:00:00Z",
  "scheduledEnd": "2024-12-26T14:00:00Z",
  "status": true
}
```

**Activar/Inactivar actividad:**
```json
PUT /api/activities/{activityId}/toggle-status
{
  "status": false
}
```

### Notas Importantes

- Las actividades ahora pueden existir sin planeaciones
- Las planeaciones pueden activarse/inactivarse independientemente
- El soft delete se realiza cambiando `status` a `false`
- La consulta por fecha (`GET /api/activities/by-date`) ahora usa `activity_schedule`

