# Ejemplos de cURL para Postman - Guías

## Configuración Base

**Base URL:** `http://localhost:3000` (ajusta según tu entorno)
**Endpoint Base:** `/api/guides`

**Nota:** Puedes copiar estos cURL directamente en Postman usando **Import > Raw Text**

---

## 1. CREAR Guía (POST)

### Crear Guía SIN Idiomas (Comportamiento Original)
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

### Crear Guía CON Idiomas (NUEVO)
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

### Variante: Sin teléfono pero con idiomas
```bash
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "María González",
    "email": "maria.gonzalez@example.com",
    "status": true,
    "languageIds": [
        "lang-uuid-espanol"
    ]
}'
```

### Variante: Guía inactivo con idiomas
```bash
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Carlos Rodríguez",
    "email": "carlos.rodriguez@example.com",
    "phone": "+506 7777-7777",
    "status": false,
    "languageIds": [
        "lang-uuid-espanol",
        "lang-uuid-ingles",
        "lang-uuid-frances"
    ]
}'
```

**Nota:** El campo `languageIds` es opcional. Si no lo envías, el guía se crea sin idiomas. Si lo envías, los idiomas se asignan automáticamente al crear el guía.

---

## 2. LISTAR Todos los Guías (GET)

**Nota:** ✨ Este endpoint ahora retorna los idiomas asociados a cada guía en el campo `languages`.

### Lista básica (página 1, 10 registros)
```bash
curl --location 'http://localhost:3000/api/guides'
```

### Con paginación (página 2, 20 registros)
```bash
curl --location 'http://localhost:3000/api/guides?page=2&limit=20'
```

### Con paginación personalizada
```bash
curl --location 'http://localhost:3000/api/guides?page=1&limit=50'
```

### Con Headers Completo (ejemplo real)
```bash
curl "http://localhost:3000/api/guides?page=1&limit=10" \
  -H "Accept: application/json, text/plain, */*" \
  -H "Authorization: Bearer fake.jwt.token"
```

**Respuesta ahora incluye idiomas:**
```json
{
    "items": [
        {
            "id": "uuid",
            "name": "Juan Pérez",
            "email": "juan.perez@example.com",
            "phone": "+506 8888-8888",
            "status": true,
            "languages": [
                {
                    "id": "lang-uuid-1",
                    "code": "es",
                    "name": "Español"
                }
            ]
        }
    ],
    "pagination": { ... }
}
```

---

## 3. OBTENER Guía por ID (GET)

```bash
curl --location 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000'
```

**Nota:** Reemplaza `123e4567-e89b-12d3-a456-426614174000` con un ID real de tu base de datos.

### Ejemplo con ID real (ajusta el UUID)
```bash
curl --location 'http://localhost:3000/api/guides/YOUR-GUIDE-UUID-HERE'
```

---

## 4. ACTUALIZAR Guía (PUT)

**Nota:** ✨ Este endpoint ahora acepta `languageIds` opcional para actualizar los idiomas del guía.

### Actualizar solo el nombre (mantiene idiomas actuales)
```bash
curl --location --request PUT 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Juan Pérez Actualizado"
}'
```

### Actualizar email y teléfono (mantiene idiomas actuales)
```bash
curl --location --request PUT 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
    "email": "nuevo.email@example.com",
    "phone": "+506 9999-9999"
}'
```

### Actualizar estado a inactivo
```bash
curl --location --request PUT 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
    "status": false
}'
```

### Actualizar SOLO los idiomas (NUEVO)
```bash
curl --location --request PUT 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": [
        "lang-uuid-espanol",
        "lang-uuid-ingles",
        "lang-uuid-frances"
    ]
}'
```

### Actualizar todos los campos INCLUYENDO idiomas (NUEVO)
```bash
curl --location --request PUT 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Juan Pérez Modificado",
    "email": "juan.modificado@example.com",
    "phone": "+506 5555-5555",
    "status": true,
    "languageIds": [
        "lang-uuid-espanol",
        "lang-uuid-ingles"
    ]
}'
```

### Eliminar todos los idiomas (array vacío)
```bash
curl --location --request PUT 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": []
}'
```

**Nota:** 
- Reemplaza `123e4567-e89b-12d3-a456-426614174000` con un ID real de tu base de datos.
- El campo `languageIds` es opcional. Si no lo envías, los idiomas actuales se mantienen.
- Si envías `languageIds`, reemplaza TODOS los idiomas existentes con los nuevos.

---

## 5. ELIMINAR Guía (DELETE)

**Nota:** ✨ Este endpoint ahora elimina automáticamente las relaciones con idiomas al hacer soft delete.

```bash
curl --location --request DELETE 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000'
```

### Con Headers
```bash
curl --location --request DELETE 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000' \
--header 'Accept: application/json, text/plain, */*' \
--header 'Authorization: Bearer fake.jwt.token'
```

**Comportamiento:**
1. Cambia el `status` del guía a `false` (soft delete)
2. **Elimina todas las relaciones** en `ops.guide_language` para ese guía
3. Actualiza `updated_at` automáticamente

**Nota:** 
- Reemplaza `123e4567-e89b-12d3-a456-426614174000` con un ID real.
- Este endpoint hace un **soft delete** (cambia `status` a `false`, no elimina físicamente el registro).
- Las relaciones con idiomas se eliminan físicamente (no soft delete).

### Ejemplo con ID real
```bash
curl --location --request DELETE 'http://localhost:3000/api/guides/YOUR-GUIDE-UUID-HERE'
```

---

## 6. CONSULTAR DISPONIBILIDAD (GET)

### Disponibilidad básica (por fecha)
```bash
curl --location 'http://localhost:3000/api/guides/availability?date=2024-12-25'
```

### Disponibilidad con tipo de actividad
```bash
curl --location 'http://localhost:3000/api/guides/availability?date=2024-12-25&activityTypeId=abc-123-def-456-ghi-789'
```

### Disponibilidad con idiomas requeridos
```bash
curl --location 'http://localhost:3000/api/guides/availability?date=2024-12-25&languageIds=lang-uuid-1,lang-uuid-2'
```

### Disponibilidad completa (fecha + tipo + idiomas)
```bash
curl --location 'http://localhost:3000/api/guides/availability?date=2024-12-25&activityTypeId=abc-123-def&languageIds=lang-uuid-1,lang-uuid-2'
```

**Nota:** Reemplaza los UUIDs con IDs reales de tu base de datos.

---

## 7. ASIGNAR IDIOMAS a un Guía (POST)

### Asignar múltiples idiomas
```bash
curl --location --request POST 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000/languages' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": [
        "lang-uuid-espanol",
        "lang-uuid-ingles",
        "lang-uuid-frances"
    ]
}'
```

### Asignar un solo idioma
```bash
curl --location --request POST 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000/languages' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": [
        "lang-uuid-espanol"
    ]
}'
```

### Eliminar todos los idiomas (enviar array vacío)
```bash
curl --location --request POST 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000/languages' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": []
}'
```

### Actualizar idiomas existentes (reemplazar)
```bash
# Este endpoint REEMPLAZA todos los idiomas existentes
# Si el guía tenía español e inglés, y envías solo portugués,
# el resultado final será solo portugués
curl --location --request POST 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000/languages' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": [
        "lang-uuid-portugues"
    ]
}'
```

**Nota:** 
- Reemplaza los UUIDs con IDs reales:
  - `123e4567-e89b-12d3-a456-426614174000` = ID del guía
  - `lang-uuid-*` = IDs de idiomas en tu base de datos
- **IMPORTANTE:** Este endpoint **reemplaza** todos los idiomas existentes. Si necesitas agregar sin eliminar, primero obtén los idiomas actuales con `GET /api/guides/:id`, combínalos con los nuevos, y luego envía el array completo.

### Flujo Completo: Asignar Idiomas

**Paso 1:** Obtener IDs de idiomas disponibles
```bash
curl --location 'http://localhost:3000/api/languages'
```

**Paso 2:** Obtener ID del guía
```bash
curl --location 'http://localhost:3000/api/guides'
```

**Paso 3:** Asignar idiomas al guía
```bash
curl --location --request POST 'http://localhost:3000/api/guides/[GUIDE-ID]/languages' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": ["LANG-ID-1", "LANG-ID-2"]
}'
```

**Paso 4:** Verificar que se asignaron correctamente
```bash
curl --location 'http://localhost:3000/api/guides/[GUIDE-ID]'
# Deberías ver el guía con el array "languages" actualizado
```

---

## Ejemplos para Diferentes Entornos

### Local (puerto 3000)
```bash
http://localhost:3000/api/guides
```

### Producción/Staging (ajusta la URL)
```bash
https://tu-dominio.com/api/guides
```

### Con puerto personalizado
```bash
http://localhost:5000/api/guides
```

---

## Cómo usar en Postman

### Opción 1: Importar cURL
1. Abre Postman
2. Click en **Import** (botón superior izquierdo)
3. Selecciona la pestaña **Raw Text**
4. Pega el cURL completo
5. Click en **Continue** y luego **Import**

### Opción 2: Crear manualmente
1. Selecciona el método (GET, POST, PUT, DELETE)
2. Ingresa la URL: `http://localhost:3000/api/guides`
3. Para POST/PUT:
   - Ve a la pestaña **Body**
   - Selecciona **raw**
   - Selecciona **JSON** en el dropdown
   - Pega el JSON del cuerpo

---

## Valores de Ejemplo

### UUIDs de ejemplo (reemplázalos con UUIDs reales)
- **Guía ID:** `123e4567-e89b-12d3-a456-426614174000`
- **Idioma Español:** `lang-123-uuid`
- **Idioma Inglés:** `lang-456-uuid`
- **Tipo Actividad:** `activity-type-uuid`

### Cómo obtener UUIDs reales
1. **Guías:** Usa el endpoint `GET /api/guides` para ver los IDs
2. **Idiomas:** Consulta la tabla `ops.language` en tu base de datos
3. **Tipos de Actividad:** Usa el endpoint `GET /api/activity-types`

---

## Respuestas de Ejemplo

### Crear Guía (201 Created)
```json
{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+506 8888-8888",
    "status": true
}
```

### Listar Guías (200 OK)
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
        "total": 1,
        "totalPages": 1
    }
}
```

### Error 400 Bad Request
```json
{
    "status": 400,
    "message": "fullName y email son requeridos"
}
```

### Error 404 Not Found
```json
{
    "status": 404,
    "message": "Guía no encontrado"
}
```

### Error 409 Conflict
```json
{
    "status": 409,
    "message": "Ya existe un guía con ese email"
}
```

---

## Flujo Completo de Prueba

### 1. Crear un guía
```bash
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+506 8888-8888"
}'
```
**Guarda el `id` de la respuesta**

### 2. Obtener el guía creado
```bash
curl --location 'http://localhost:3000/api/guides/[ID-DEL-PASO-1]'
```

### 3. Actualizar el guía
```bash
curl --location --request PUT 'http://localhost:3000/api/guides/[ID-DEL-PASO-1]' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Juan Pérez Actualizado"
}'
```

### 4. Asignar idiomas
```bash
curl --location --request POST 'http://localhost:3000/api/guides/[ID-DEL-PASO-1]/languages' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": ["LANG-UUID-1", "LANG-UUID-2"]
}'
```

### 5. Verificar disponibilidad
```bash
curl --location 'http://localhost:3000/api/guides/availability?date=2024-12-25'
```

### 6. Eliminar el guía (soft delete)
```bash
curl --location --request DELETE 'http://localhost:3000/api/guides/[ID-DEL-PASO-1]'
```

---

## Tips Útiles

1. **Variables de Postman:** Puedes crear una variable `base_url` con valor `http://localhost:3000` y usarla como `{{base_url}}/api/guides`

2. **Colección:** Crea una colección en Postman llamada "Guías" y organiza todos estos endpoints ahí

3. **Variables de Entorno:** 
   - Crea un entorno "Local" con `base_url = http://localhost:3000`
   - Crea un entorno "Production" con `base_url = https://tu-dominio.com`

4. **Tests en Postman:** Puedes agregar tests para verificar que las respuestas sean correctas

5. **Autenticación:** Si tu API requiere autenticación, agrega el header `Authorization` en Postman

---

## Colección Postman Completa

Si quieres, puedes crear una colección JSON completa para importar en Postman. Aquí tienes la estructura básica:

```json
{
    "info": {
        "name": "Guías API",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "item": [
        {
            "name": "Crear Guía",
            "request": {
                "method": "POST",
                "header": [
                    {
                        "key": "Content-Type",
                        "value": "application/json"
                    }
                ],
                "body": {
                    "mode": "raw",
                    "raw": "{\n    \"fullName\": \"Juan Pérez\",\n    \"email\": \"juan.perez@example.com\",\n    \"phone\": \"+506 8888-8888\",\n    \"status\": true\n}"
                },
                "url": {
                    "raw": "{{base_url}}/api/guides",
                    "host": ["{{base_url}}"],
                    "path": ["api", "guides"]
                }
            }
        }
    ]
}
```

