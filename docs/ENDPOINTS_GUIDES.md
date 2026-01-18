# Endpoints de Mantenimiento de Guías

## Base URL
Todos los endpoints están bajo el prefijo `/api/guides`

## Endpoints Disponibles

### 1. Consultar Disponibilidad de Guías
**GET** `/api/guides/availability`

Obtiene la lista de guías disponibles para una fecha específica, opcionalmente filtrada por tipo de actividad e idiomas.

#### Parámetros de Query:
- `date` (requerido, string, formato: YYYY-MM-DD): Fecha para consultar disponibilidad
  - Ejemplo: `2024-12-25`
- `activityTypeId` (opcional, UUID): ID del tipo de actividad
- `languageIds` (opcional, string): IDs de idiomas separados por coma
  - Ejemplo: `123e4567-e89b-12d3-a456-426614174000,223e4567-e89b-12d3-a456-426614174001`

#### Respuesta 200:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Juan Pérez",
    "email": "juan.perez@example.com",
    "is_available": true,
    "languages": ["es", "en"]
  }
]
```

#### Respuesta 400:
```json
{
  "status": 400,
  "message": "date es requerido (YYYY-MM-DD)"
}
```

#### Ejemplo de Uso:
```bash
# Disponibilidad para una fecha
GET /api/guides/availability?date=2024-12-25

# Disponibilidad para un tipo de actividad específico
GET /api/guides/availability?date=2024-12-25&activityTypeId=abc-123-def

# Disponibilidad con idiomas requeridos
GET /api/guides/availability?date=2024-12-25&languageIds=id1,id2
```

---

### 2. Listar Todos los Guías
**GET** `/api/guides`

Obtiene una lista paginada de todos los guías registrados en el sistema.

#### Parámetros de Query:
- `page` (opcional, integer, default: 1): Número de página (mínimo: 1)
- `limit` (opcional, integer, default: 10): Cantidad de registros por página (mínimo: 1, máximo: 100)

#### Respuesta 200:
```json
{
  "items": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Juan Pérez",
      "email": "juan.perez@example.com",
      "phone": "+506 8888-8888",
      "status": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

#### Ejemplo de Uso:
```bash
# Primera página con 10 registros (por defecto)
GET /api/guides

# Página 2 con 20 registros
GET /api/guides?page=2&limit=20
```

---

### 3. Obtener Guía por ID
**GET** `/api/guides/:id`

Obtiene la información completa de un guía incluyendo sus idiomas asignados.

#### Parámetros de Path:
- `id` (requerido, UUID): ID del guía

#### Respuesta 200:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Juan Pérez",
  "email": "juan.perez@example.com",
  "phone": "+506 8888-8888",
  "status": true,
  "languages": [
    {
      "id": "lang-123",
      "code": "es",
      "name": "Español"
    },
    {
      "id": "lang-456",
      "code": "en",
      "name": "English"
    }
  ]
}
```

#### Respuesta 404:
```json
{
  "status": 404,
  "message": "Guía no encontrado"
}
```

#### Ejemplo de Uso:
```bash
GET /api/guides/123e4567-e89b-12d3-a456-426614174000
```

---

### 4. Crear Nuevo Guía
**POST** `/api/guides`

Crea un nuevo guía en el sistema.

#### Body (JSON):
```json
{
  "fullName": "Juan Pérez",
  "email": "juan.perez@example.com",
  "phone": "+506 8888-8888",
  "status": true
}
```

#### Campos:
- `fullName` (requerido, string): Nombre completo del guía
- `email` (requerido, string): Correo electrónico
- `phone` (opcional, string): Teléfono
- `status` (opcional, boolean, default: true): Estado activo/inactivo

#### Respuesta 201:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Juan Pérez",
  "email": "juan.perez@example.com",
  "phone": "+506 8888-8888",
  "status": true
}
```

#### Respuesta 400:
```json
{
  "status": 400,
  "message": "fullName y email son requeridos"
}
```

#### Respuesta 409:
```json
{
  "status": 409,
  "message": "Ya existe un guía con ese email"
}
```

#### Ejemplo de Uso:
```bash
POST /api/guides
Content-Type: application/json

{
  "fullName": "María González",
  "email": "maria.gonzalez@example.com",
  "phone": "+506 7777-7777"
}
```

---

### 5. Actualizar Guía
**PUT** `/api/guides/:id`

Actualiza la información de un guía existente. Solo se actualizan los campos proporcionados.

#### Parámetros de Path:
- `id` (requerido, UUID): ID del guía

#### Body (JSON):
```json
{
  "fullName": "Juan Pérez Actualizado",
  "email": "nuevo.email@example.com",
  "phone": "+506 9999-9999",
  "status": false
}
```

#### Campos (todos opcionales):
- `fullName` (string): Nombre completo
- `email` (string): Correo electrónico
- `phone` (string): Teléfono
- `status` (boolean): Estado activo/inactivo

#### Respuesta 200:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Juan Pérez Actualizado",
  "email": "nuevo.email@example.com",
  "phone": "+506 9999-9999",
  "status": false,
  "languages": [...]
}
```

#### Respuesta 404:
```json
{
  "status": 404,
  "message": "Guía no encontrado"
}
```

#### Ejemplo de Uso:
```bash
PUT /api/guides/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json

{
  "fullName": "Juan Pérez Actualizado",
  "status": false
}
```

---

### 6. Eliminar Guía
**DELETE** `/api/guides/:id`

Realiza un soft delete del guía (cambia su status a false). No elimina físicamente el registro.

#### Parámetros de Path:
- `id` (requerido, UUID): ID del guía

#### Respuesta 200:
```json
{
  "message": "Guía eliminado correctamente",
  "guide": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+506 8888-8888",
    "status": false
  }
}
```

#### Respuesta 404:
```json
{
  "status": 404,
  "message": "Guía no encontrado"
}
```

#### Ejemplo de Uso:
```bash
DELETE /api/guides/123e4567-e89b-12d3-a456-426614174000
```

---

### 7. Asignar Idiomas a un Guía
**POST** `/api/guides/:id/languages`

Asigna o actualiza los idiomas que habla un guía. Reemplaza los idiomas existentes.

#### Parámetros de Path:
- `id` (requerido, UUID): ID del guía

#### Body (JSON):
```json
{
  "languageIds": [
    "lang-123-uuid",
    "lang-456-uuid"
  ]
}
```

#### Campos:
- `languageIds` (requerido, array de UUID): Array de IDs de idiomas que habla el guía

#### Respuesta 200:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Juan Pérez",
  "email": "juan.perez@example.com",
  "phone": "+506 8888-8888",
  "status": true,
  "languages": [
    {
      "id": "lang-123-uuid",
      "code": "es",
      "name": "Español"
    },
    {
      "id": "lang-456-uuid",
      "code": "en",
      "name": "English"
    }
  ]
}
```

#### Respuesta 400:
```json
{
  "status": 400,
  "message": "languageIds debe ser un arreglo de UUID"
}
```

#### Ejemplo de Uso:
```bash
POST /api/guides/123e4567-e89b-12d3-a456-426614174000/languages
Content-Type: application/json

{
  "languageIds": ["lang-123-uuid", "lang-456-uuid"]
}

# Para eliminar todos los idiomas, enviar un array vacío:
{
  "languageIds": []
}
```

---

## Resumen de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/guides/availability` | Consultar disponibilidad |
| GET | `/api/guides` | Listar todos (paginado) |
| GET | `/api/guides/:id` | Obtener por ID |
| POST | `/api/guides` | Crear nuevo |
| PUT | `/api/guides/:id` | Actualizar |
| DELETE | `/api/guides/:id` | Eliminar (soft delete) |
| POST | `/api/guides/:id/languages` | Asignar idiomas |

## Estructura de Datos

### Guía (Guide)
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "phone": "string | null",
  "status": "boolean",
  "languages": [
    {
      "id": "uuid",
      "code": "string",
      "name": "string"
    }
  ]
}
```

### Campos Disponibles:
- `id`: UUID único del guía (generado automáticamente)
- `name`: Nombre completo del guía (requerido)
- `email`: Correo electrónico (requerido)
- `phone`: Teléfono (opcional)
- `status`: Estado activo/inactivo (boolean, default: true)
- `languages`: Array de idiomas que habla el guía

### Campos Eliminados:
- ❌ `is_leader`: Ya no se utiliza
- ❌ `max_party_size`: Ya no se utiliza

## Notas Importantes

1. **Soft Delete**: El endpoint DELETE no elimina físicamente el registro, solo cambia `status` a `false`.

2. **Idiomas**: Los idiomas deben existir previamente en la tabla `ops.language` antes de asignarlos a un guía.

3. **Paginación**: Los endpoints de listado soportan paginación. El máximo de registros por página es 100.

4. **Disponibilidad**: El endpoint de disponibilidad verifica qué guías NO están asignados a actividades en la fecha especificada.

5. **Validaciones**:
   - `fullName` y `email` son requeridos al crear un guía
   - `email` debe ser único en el sistema
   - `languageIds` debe ser un array válido de UUID al asignar idiomas

