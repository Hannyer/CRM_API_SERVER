# Script de Reconstrucción de Tabla de Guías

## Propósito

Este script (`create_guides_table.sql`) reconstruye completamente las estructuras relacionadas con el mantenimiento de guías en la base de datos PostgreSQL, incluyendo:

1. **Tabla principal `ops.guide`** - Información de los guías turísticos
2. **Tabla de relación `ops.guide_language`** - Relación muchos a muchos entre guías e idiomas
3. **Función `ops.get_guides_availability`** - Función para consultar disponibilidad de guías
4. **Índices y triggers** - Para optimización y auditoría

## Estructura de la Tabla `ops.guide`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único (generado automáticamente) |
| `name` | TEXT | Nombre completo del guía (requerido) |
| `email` | TEXT | Correo electrónico (opcional) |
| `phone` | TEXT | Teléfono (opcional) |
| `is_leader` | BOOLEAN | Indica si es guía líder (default: false) |
| `status` | BOOLEAN | Estado activo/inactivo (default: true) |
| `max_party_size` | INTEGER | Tamaño máximo de grupo que puede manejar (NULL = sin límite) |
| `created_at` | TIMESTAMPTZ | Fecha de creación (automático) |
| `updated_at` | TIMESTAMPTZ | Fecha de última actualización (automático) |

## Estructura de la Tabla `ops.guide_language`

Tabla de relación muchos a muchos que vincula guías con los idiomas que hablan.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `guide_id` | UUID | ID del guía (FK a ops.guide) |
| `language_id` | UUID | ID del idioma (FK a ops.language) |

**Clave primaria compuesta:** (`guide_id`, `language_id`)

## Función `ops.get_guides_availability`

Esta función determina qué guías están disponibles para una fecha específica.

### Parámetros:
- `p_date` (DATE, requerido): Fecha para consultar disponibilidad
- `p_activity_type_id` (UUID, opcional): Filtrar por tipo de actividad
- `p_language_ids` (UUID[], opcional): Array de IDs de idiomas requeridos

### Retorna:
- `id` (UUID): ID del guía
- `name` (TEXT): Nombre del guía
- `email` (TEXT): Email del guía
- `is_leader` (BOOLEAN): Si es líder
- `is_available` (BOOLEAN): Si está disponible en esa fecha
- `languages` (TEXT[]): Array de códigos de idiomas que habla

### Lógica:
1. Obtiene todos los guías activos con sus idiomas
2. Identifica guías asignados a actividades en la fecha especificada
3. Filtra por tipo de actividad si se proporciona
4. Filtra por idiomas requeridos si se proporcionan
5. Marca disponibilidad según si están asignados o no

## Uso del Script

### Ejecución desde línea de comandos:

```bash
psql -U <usuario> -d <nombre_base_datos> -f scripts/create_guides_table.sql
```

### Ejecución interactiva en psql:

```sql
\i scripts/create_guides_table.sql
```

### Verificación después de ejecutar:

```sql
-- Verificar que la tabla existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'ops' AND table_name IN ('guide', 'guide_language');

-- Ver estructura de la tabla
\d ops.guide

-- Verificar la función
\df ops.get_guides_availability

-- Contar registros (debería estar vacía)
SELECT COUNT(*) FROM ops.guide;
```

## Dependencias

Este script requiere:

1. **Esquema `ops`** - Se crea automáticamente si no existe
2. **Tabla `ops.language`** - Se crea automáticamente si no existe (tabla de idiomas)
3. **Tabla `ops.activity`** - Debe existir para que funcione correctamente la función de disponibilidad
4. **Tabla `ops.activity_schedule`** - Debe existir para la función de disponibilidad
5. **Tabla `ops.activity_assignment`** - Debe existir para la función de disponibilidad

**Nota:** Si estas tablas relacionadas no existen, la función de disponibilidad puede no funcionar correctamente, pero la tabla `guide` y `guide_language` se crearán sin problemas.

## Notas Importantes

1. **Datos existentes:** Este script usa `CREATE TABLE IF NOT EXISTS`, por lo que si las tablas ya existen, no las sobrescribirá. Si necesitas eliminar y recrear:

   ```sql
   -- CUIDADO: Esto eliminará todos los datos
   DROP TABLE IF EXISTS ops.guide_language CASCADE;
   DROP TABLE IF EXISTS ops.guide CASCADE;
   ```

   Luego ejecuta el script nuevamente.

2. **Trigger de actualización:** El script incluye un trigger que actualiza automáticamente `updated_at` cada vez que se modifica un registro.

3. **Índices:** Se crean índices en campos clave para optimizar consultas:
   - `status` - Para filtrar guías activos/inactivos
   - `is_leader` - Para filtrar líderes
   - `email` - Para búsquedas por email

4. **Restricciones de integridad referencial:**
   - `guide_language.guide_id` referencia `guide.id` con `ON DELETE CASCADE`
   - `guide_language.language_id` referencia `language.id` con `ON DELETE CASCADE`

## Ejemplos de Uso

### Crear un guía:

```sql
INSERT INTO ops.guide (name, email, phone, is_leader, status, max_party_size)
VALUES ('Juan Pérez', 'juan@example.com', '+506 8888-8888', false, true, 20);
```

### Asignar idiomas a un guía:

```sql
-- Primero obtener los IDs de los idiomas
SELECT id, code, name FROM ops.language;

-- Asignar idiomas (ejemplo con IDs ficticios)
INSERT INTO ops.guide_language (guide_id, language_id)
VALUES 
    ('<guide_id>', '<language_id_espanol>'),
    ('<guide_id>', '<language_id_ingles>');
```

### Consultar disponibilidad de guías:

```sql
-- Todos los guías disponibles para una fecha
SELECT * FROM ops.get_guides_availability('2024-12-25'::DATE);

-- Guías disponibles para un tipo de actividad específico
SELECT * FROM ops.get_guides_availability(
    '2024-12-25'::DATE,
    '<activity_type_id>'::UUID
);

-- Guías disponibles que hablen español e inglés
SELECT * FROM ops.get_guides_availability(
    '2024-12-25'::DATE,
    NULL,
    ARRAY['<language_id_espanol>'::UUID, '<language_id_ingles>'::UUID]
);
```

## Solución de Problemas

### Error: "relation ops.language does not exist"
**Solución:** El script intenta crear la tabla `ops.language` si no existe. Si aún así falla, ejecuta primero el script `create_full_database.sql` que crea todas las tablas base.

### Error: "function ops.get_guides_availability does not exist"
**Solución:** Verifica que el script se ejecutó completamente sin errores. Revisa los logs de psql para ver si hubo algún error al crear la función.

### La función retorna guías no disponibles
**Solución:** Verifica que las tablas `ops.activity`, `ops.activity_schedule` y `ops.activity_assignment` existan y tengan la estructura correcta.

## Archivos Relacionados

- `src/repository/guides.repository.js` - Repositorio que usa estas tablas
- `src/services/guides.service.js` - Servicio de lógica de negocio
- `src/controllers/guides.controller.js` - Controladores de la API
- `scripts/create_full_database.sql` - Script completo de la base de datos

