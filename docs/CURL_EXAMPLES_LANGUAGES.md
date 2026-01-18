# Ejemplos de cURL para Postman - Idiomas (Languages)

## Configuración Base

**Base URL:** `http://localhost:3000` (ajusta según tu entorno)
**Endpoint Base:** `/api/languages`

**Nota:** Puedes copiar estos cURL directamente en Postman usando **Import > Raw Text**

---

## 1. CREAR Idioma (POST)

```bash
curl --location 'http://localhost:3000/api/languages' \
--header 'Content-Type: application/json' \
--data '{
    "code": "es",
    "name": "Español",
    "status": true
}'
```

### Variante: Idioma inactivo
```bash
curl --location 'http://localhost:3000/api/languages' \
--header 'Content-Type: application/json' \
--data '{
    "code": "fr",
    "name": "Francés",
    "status": false
}'
```

### Variante: Con status por defecto (true)
```bash
curl --location 'http://localhost:3000/api/languages' \
--header 'Content-Type: application/json' \
--data '{
    "code": "en",
    "name": "English"
}'
```

---

## 2. LISTAR Todos los Idiomas (GET)

### Lista básica (página 1, 10 registros)
```bash
curl --location 'http://localhost:3000/api/languages'
```

### Con paginación (página 2, 20 registros)
```bash
curl --location 'http://localhost:3000/api/languages?page=2&limit=20'
```

### Con paginación personalizada
```bash
curl --location 'http://localhost:3000/api/languages?page=1&limit=50'
```

---

## 3. OBTENER Idioma por ID (GET)

```bash
curl --location 'http://localhost:3000/api/languages/123e4567-e89b-12d3-a456-426614174000'
```

**Nota:** Reemplaza `123e4567-e89b-12d3-a456-426614174000` con un ID real de tu base de datos.

### Ejemplo con ID real (ajusta el UUID)
```bash
curl --location 'http://localhost:3000/api/languages/YOUR-LANGUAGE-UUID-HERE'
```

---

## 4. ACTUALIZAR Idioma (PUT)

### Actualizar solo el nombre
```bash
curl --location --request PUT 'http://localhost:3000/api/languages/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
    "name": "Español Actualizado"
}'
```

### Actualizar código y nombre
```bash
curl --location --request PUT 'http://localhost:3000/api/languages/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
    "code": "es-MX",
    "name": "Español de México"
}'
```

### Actualizar estado a inactivo
```bash
curl --location --request PUT 'http://localhost:3000/api/languages/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
    "status": false
}'
```

### Actualizar todos los campos
```bash
curl --location --request PUT 'http://localhost:3000/api/languages/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
    "code": "pt",
    "name": "Portugués",
    "status": true
}'
```

**Nota:** Reemplaza `123e4567-e89b-12d3-a456-426614174000` con un ID real de tu base de datos.

---

## 5. ELIMINAR Idioma (DELETE)

```bash
curl --location --request DELETE 'http://localhost:3000/api/languages/123e4567-e89b-12d3-a456-426614174000'
```

**Nota:** 
- Reemplaza `123e4567-e89b-12d3-a456-426614174000` con un ID real.
- Este endpoint hace un **soft delete** (cambia `status` a `false`, no elimina físicamente el registro).

### Ejemplo con ID real
```bash
curl --location --request DELETE 'http://localhost:3000/api/languages/YOUR-LANGUAGE-UUID-HERE'
```

---

## Ejemplos para Diferentes Entornos

### Local (puerto 3000)
```bash
http://localhost:3000/api/languages
```

### Producción/Staging (ajusta la URL)
```bash
https://tu-dominio.com/api/languages
```

### Con puerto personalizado
```bash
http://localhost:5000/api/languages
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
2. Ingresa la URL: `http://localhost:3000/api/languages`
3. Para POST/PUT:
   - Ve a la pestaña **Body**
   - Selecciona **raw**
   - Selecciona **JSON** en el dropdown
   - Pega el JSON del cuerpo

---

## Valores de Ejemplo

### UUIDs de ejemplo (reemplázalos con UUIDs reales)
- **Idioma ID:** `123e4567-e89b-12d3-a456-426614174000`

### Códigos de idioma comunes
- `es` - Español
- `en` - Inglés
- `fr` - Francés
- `pt` - Portugués
- `de` - Alemán
- `it` - Italiano
- `ja` - Japonés
- `zh` - Chino

### Cómo obtener UUIDs reales
1. **Idiomas:** Usa el endpoint `GET /api/languages` para ver los IDs

---

## Respuestas de Ejemplo

### Crear Idioma (201 Created)
```json
{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "code": "es",
    "name": "Español",
    "status": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### Listar Idiomas (200 OK)
```json
{
    "items": [
        {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "code": "es",
            "name": "Español",
            "status": true,
            "created_at": "2024-01-01T00:00:00.000Z",
            "updated_at": "2024-01-01T00:00:00.000Z"
        },
        {
            "id": "223e4567-e89b-12d3-a456-426614174001",
            "code": "en",
            "name": "English",
            "status": true,
            "created_at": "2024-01-01T00:00:00.000Z",
            "updated_at": "2024-01-01T00:00:00.000Z"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 10,
        "total": 2,
        "totalPages": 1
    }
}
```

### Obtener Idioma por ID (200 OK)
```json
{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "code": "es",
    "name": "Español",
    "status": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### Error 400 Bad Request
```json
{
    "status": 400,
    "message": "code y name son requeridos"
}
```

### Error 404 Not Found
```json
{
    "status": 404,
    "message": "Idioma no encontrado"
}
```

### Error 409 Conflict
```json
{
    "status": 409,
    "message": "Ya existe un idioma con ese código"
}
```

---

## Flujo Completo de Prueba

### 1. Crear un idioma
```bash
curl --location 'http://localhost:3000/api/languages' \
--header 'Content-Type: application/json' \
--data '{
    "code": "es",
    "name": "Español"
}'
```
**Guarda el `id` de la respuesta**

### 2. Obtener el idioma creado
```bash
curl --location 'http://localhost:3000/api/languages/[ID-DEL-PASO-1]'
```

### 3. Actualizar el idioma
```bash
curl --location --request PUT 'http://localhost:3000/api/languages/[ID-DEL-PASO-1]' \
--header 'Content-Type: application/json' \
--data '{
    "name": "Español Actualizado"
}'
```

### 4. Listar todos los idiomas
```bash
curl --location 'http://localhost:3000/api/languages?page=1&limit=10'
```

### 5. Eliminar el idioma (soft delete)
```bash
curl --location --request DELETE 'http://localhost:3000/api/languages/[ID-DEL-PASO-1]'
```

---

## Resumen de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/languages` | Listar todos (paginado) |
| GET | `/api/languages/:id` | Obtener por ID |
| POST | `/api/languages` | Crear nuevo |
| PUT | `/api/languages/:id` | Actualizar |
| DELETE | `/api/languages/:id` | Eliminar (soft delete) |

## Estructura de Datos

### Idioma (Language)
```json
{
  "id": "uuid",
  "code": "string",
  "name": "string",
  "status": "boolean",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Campos Disponibles:
- `id`: UUID único del idioma (generado automáticamente)
- `code`: Código del idioma (requerido, único, ejemplo: "es", "en")
- `name`: Nombre del idioma (requerido, ejemplo: "Español", "English")
- `status`: Estado activo/inactivo (boolean, default: true)
- `created_at`: Fecha de creación (automático)
- `updated_at`: Fecha de última actualización (automático)

## Notas Importantes

1. **Soft Delete**: El endpoint DELETE no elimina físicamente el registro, solo cambia `status` a `false`.

2. **Código único**: El campo `code` debe ser único en el sistema. Si intentas crear un idioma con un código que ya existe, recibirás un error 409.

3. **Paginación**: El endpoint de listado soporta paginación. El máximo de registros por página es 100.

4. **Validaciones**:
   - `code` y `name` son requeridos al crear un idioma
   - `code` debe ser único en el sistema
   - Todos los campos son opcionales al actualizar (solo se actualizan los proporcionados)

5. **Timestamps**: Los campos `created_at` y `updated_at` se actualizan automáticamente.

---

## Tips Útiles

1. **Variables de Postman:** Puedes crear una variable `base_url` con valor `http://localhost:3000` y usarla como `{{base_url}}/api/languages`

2. **Colección:** Crea una colección en Postman llamada "Idiomas" y organiza todos estos endpoints ahí

3. **Variables de Entorno:** 
   - Crea un entorno "Local" con `base_url = http://localhost:3000`
   - Crea un entorno "Production" con `base_url = https://tu-dominio.com`

4. **Tests en Postman:** Puedes agregar tests para verificar que las respuestas sean correctas

5. **Autenticación:** Si tu API requiere autenticación, agrega el header `Authorization` en Postman

