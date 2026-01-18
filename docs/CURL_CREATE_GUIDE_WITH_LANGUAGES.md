# Crear Guía con Idiomas - Ejemplos de cURL

## Descripción

El endpoint `POST /api/guides` ahora acepta un campo opcional `languageIds` que permite asignar idiomas directamente al crear un guía. Esto elimina la necesidad de hacer una llamada adicional para asignar idiomas.

---

## Endpoint

**POST** `/api/guides`

---

## Ejemplos de cURL

### 1. Crear Guía SIN Idiomas (Comportamiento Original)

```bash
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+506 8888-8888",
    "status": true
}'
```

**Respuesta:**
```json
{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+506 8888-8888",
    "status": true
}
```

---

### 2. Crear Guía CON un Solo Idioma

```bash
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "María González",
    "email": "maria.gonzalez@example.com",
    "phone": "+506 7777-7777",
    "status": true,
    "languageIds": [
        "lang-uuid-espanol"
    ]
}'
```

**Respuesta:**
```json
{
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "name": "María González",
    "email": "maria.gonzalez@example.com",
    "phone": "+506 7777-7777",
    "status": true,
    "languages": [
        {
            "id": "lang-uuid-espanol",
            "code": "es",
            "name": "Español"
        }
    ]
}
```

---

### 3. Crear Guía CON Múltiples Idiomas

```bash
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Carlos Rodríguez",
    "email": "carlos.rodriguez@example.com",
    "phone": "+506 6666-6666",
    "status": true,
    "languageIds": [
        "lang-uuid-espanol",
        "lang-uuid-ingles",
        "lang-uuid-frances"
    ]
}'
```

**Respuesta:**
```json
{
    "id": "323e4567-e89b-12d3-a456-426614174002",
    "name": "Carlos Rodríguez",
    "email": "carlos.rodriguez@example.com",
    "phone": "+506 6666-6666",
    "status": true,
    "languages": [
        {
            "id": "lang-uuid-espanol",
            "code": "es",
            "name": "Español"
        },
        {
            "id": "lang-uuid-ingles",
            "code": "en",
            "name": "English"
        },
        {
            "id": "lang-uuid-frances",
            "code": "fr",
            "name": "Français"
        }
    ]
}
```

---

### 4. Crear Guía SIN Teléfono pero CON Idiomas

```bash
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Ana Martínez",
    "email": "ana.martinez@example.com",
    "status": true,
    "languageIds": [
        "lang-uuid-espanol",
        "lang-uuid-ingles"
    ]
}'
```

---

### 5. Crear Guía Inactivo CON Idiomas

```bash
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Pedro Sánchez",
    "email": "pedro.sanchez@example.com",
    "phone": "+506 5555-5555",
    "status": false,
    "languageIds": [
        "lang-uuid-espanol"
    ]
}'
```

---

### 6. Crear Guía con Array Vacío de Idiomas

```bash
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Laura Fernández",
    "email": "laura.fernandez@example.com",
    "languageIds": []
}'
```

**Nota:** Si envías un array vacío, el guía se crea sin idiomas asignados (igual que si no envías el campo).

---

## Flujo Completo: Obtener IDs de Idiomas y Crear Guía

### Paso 1: Obtener IDs de Idiomas Disponibles

```bash
# Listar todos los idiomas
curl --location 'http://localhost:3000/api/languages'
```

**Respuesta de ejemplo:**
```json
{
    "items": [
        {
            "id": "lang-uuid-espanol",
            "code": "es",
            "name": "Español",
            "status": true
        },
        {
            "id": "lang-uuid-ingles",
            "code": "en",
            "name": "English",
            "status": true
        },
        {
            "id": "lang-uuid-frances",
            "code": "fr",
            "name": "Français",
            "status": true
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 10,
        "total": 3,
        "totalPages": 1
    }
}
```

**Guarda los `id` de los idiomas que necesites.**

### Paso 2: Crear el Guía con Idiomas

```bash
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+506 8888-8888",
    "status": true,
    "languageIds": [
        "lang-uuid-espanol",
        "lang-uuid-ingles"
    ]
}'
```

### Paso 3: Verificar que se Creó Correctamente

```bash
# Obtener el guía creado (debería incluir los idiomas)
curl --location 'http://localhost:3000/api/guides/[ID-DEL-GUIA-CREADO]'
```

---

## Estructura del Body

### Campos Requeridos
- `fullName` (string): Nombre completo del guía
- `email` (string): Correo electrónico del guía

### Campos Opcionales
- `phone` (string, nullable): Teléfono del guía
- `status` (boolean, default: true): Estado activo/inactivo
- `languageIds` (array de UUID, opcional): IDs de idiomas que habla el guía

### Ejemplo Completo del Body

```json
{
    "fullName": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+506 8888-8888",
    "status": true,
    "languageIds": [
        "123e4567-e89b-12d3-a456-426614174000",
        "223e4567-e89b-12d3-a456-426614174001"
    ]
}
```

---

## Respuestas del Endpoint

### Éxito (201 Created) - Con Idiomas

```json
{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+506 8888-8888",
    "status": true,
    "languages": [
        {
            "id": "lang-uuid-1",
            "code": "es",
            "name": "Español"
        },
        {
            "id": "lang-uuid-2",
            "code": "en",
            "name": "English"
        }
    ]
}
```

### Éxito (201 Created) - Sin Idiomas

```json
{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+506 8888-8888",
    "status": true
}
```

### Error 400: Bad Request

**Campo requerido faltante:**
```json
{
    "status": 400,
    "message": "fullName y email son requeridos"
}
```

**languageIds no es un array:**
```json
{
    "status": 400,
    "message": "languageIds debe ser un arreglo de UUID"
}
```

**Ejemplo incorrecto:**
```bash
# ❌ INCORRECTO - languageIds debe ser un array
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Juan Pérez",
    "email": "juan.perez@example.com",
    "languageIds": "lang-uuid-1"
}'
```

**Ejemplo correcto:**
```bash
# ✅ CORRECTO - languageIds es un array
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Juan Pérez",
    "email": "juan.perez@example.com",
    "languageIds": ["lang-uuid-1"]
}'
```

### Error 409: Conflict

```json
{
    "status": 409,
    "message": "Ya existe un guía con ese email"
}
```

### Error 500: Error Interno

**Causas posibles:**
- Un `language_id` no existe en la base de datos
- Error de conexión a la base de datos
- Error de foreign key constraint

```json
{
    "status": 500,
    "message": "Error al crear guía"
}
```

---

## Comportamiento del Endpoint

### 1. Campo Opcional
El campo `languageIds` es completamente opcional. Si no lo envías, el guía se crea sin idiomas (comportamiento original).

### 2. Array Vacío
Si envías `languageIds: []`, el guía se crea sin idiomas (igual que si no envías el campo).

### 3. Validación de Array
Si proporcionas `languageIds`, debe ser un array. Si no es un array, recibirás un error 400.

### 4. Transacción
La creación del guía y la asignación de idiomas se realizan en secuencia. Si hay un error al asignar idiomas, el guía ya estará creado, pero sin idiomas.

### 5. Respuesta Completa
Si asignas idiomas al crear, la respuesta incluirá el array `languages` con la información completa de cada idioma.

---

## Comparación: Antes vs Ahora

### Antes (2 llamadas necesarias)

**Paso 1:** Crear guía
```bash
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Juan Pérez",
    "email": "juan.perez@example.com"
}'
```

**Paso 2:** Asignar idiomas (llamada adicional)
```bash
curl --location --request POST 'http://localhost:3000/api/guides/[ID]/languages' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": ["lang-uuid-1", "lang-uuid-2"]
}'
```

### Ahora (1 sola llamada)

```bash
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Juan Pérez",
    "email": "juan.perez@example.com",
    "languageIds": ["lang-uuid-1", "lang-uuid-2"]
}'
```

---

## Casos de Uso

### Caso 1: Crear Guía con Idiomas desde el Inicio
```bash
# Crear un guía que habla español e inglés desde el momento de creación
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "María González",
    "email": "maria@example.com",
    "languageIds": ["es-uuid", "en-uuid"]
}'
```

### Caso 2: Crear Guía y Asignar Idiomas Después
```bash
# Crear guía sin idiomas
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Carlos Rodríguez",
    "email": "carlos@example.com"
}'

# Luego asignar idiomas cuando los tengas
curl --location --request POST 'http://localhost:3000/api/guides/[ID]/languages' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": ["es-uuid"]
}'
```

---

## Tips para Postman

### Variables de Entorno

Crea estas variables en Postman:
- `base_url`: `http://localhost:3000`
- `language_id_es`: UUID del idioma español
- `language_id_en`: UUID del idioma inglés

### Request en Postman

**URL:**
```
{{base_url}}/api/guides
```

**Method:** POST

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
    "fullName": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+506 8888-8888",
    "status": true,
    "languageIds": [
        "{{language_id_es}}",
        "{{language_id_en}}"
    ]
}
```

---

## Resumen

| Aspecto | Detalle |
|---------|---------|
| **Endpoint** | `POST /api/guides` |
| **Campo Nuevo** | `languageIds` (opcional, array de UUID) |
| **Comportamiento** | Si se proporciona, asigna idiomas automáticamente |
| **Respuesta** | Incluye array `languages` si se asignaron idiomas |
| **Compatibilidad** | Totalmente compatible con código existente (campo opcional) |

---

## Notas Importantes

1. **Retrocompatibilidad**: El endpoint sigue funcionando sin `languageIds`, manteniendo compatibilidad con código existente.

2. **Validación**: Si proporcionas `languageIds`, debe ser un array válido de UUIDs.

3. **IDs de Idiomas**: Los IDs de idiomas deben existir en la tabla `ops.language`. Si un ID no existe, puede generar un error.

4. **Orden**: El orden de los idiomas en el array no afecta el resultado.

5. **Duplicados**: Si envías el mismo ID de idioma múltiples veces, solo se inserta una vez.

