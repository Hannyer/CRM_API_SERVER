# Endpoint: Asignar Idiomas a Guías

## Descripción

Este endpoint permite asignar o actualizar los idiomas que habla un guía. Reemplaza todos los idiomas existentes con los nuevos proporcionados.

**Endpoint:** `POST /api/guides/:id/languages`

**Tabla relacionada:** `ops.guide_language` (tabla de relación muchos a muchos)

---

## Estructura de la Tabla

La tabla `ops.guide_language` tiene la siguiente estructura:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `guide_id` | UUID | ID del guía (FK a ops.guide) |
| `language_id` | UUID | ID del idioma (FK a ops.language) |

**Clave primaria compuesta:** (`guide_id`, `language_id`)

---

## Ejemplos de cURL

### 1. Asignar Múltiples Idiomas a un Guía

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

### 2. Asignar un Solo Idioma

```bash
curl --location --request POST 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000/languages' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": [
        "lang-uuid-espanol"
    ]
}'
```

### 3. Eliminar Todos los Idiomas (Array Vacío)

```bash
curl --location --request POST 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000/languages' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": []
}'
```

### 4. Actualizar Idiomas Existente (Reemplazar)

```bash
# Si el guía ya tiene español e inglés, y quieres cambiarlo a solo portugués:
curl --location --request POST 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000/languages' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": [
        "lang-uuid-portugues"
    ]
}'
```

**Nota:** Este endpoint **reemplaza** todos los idiomas existentes. Si el guía tenía español e inglés, y envías solo portugués, el resultado final será solo portugués.

---

## Cómo Obtener los UUIDs

### Obtener IDs de Guías

```bash
# Listar todos los guías
curl --location 'http://localhost:3000/api/guides'

# Obtener un guía específico
curl --location 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000'
```

### Obtener IDs de Idiomas

```bash
# Listar todos los idiomas
curl --location 'http://localhost:3000/api/languages'

# Obtener un idioma específico
curl --location 'http://localhost:3000/api/languages/lang-uuid-espanol'
```

---

## Ejemplo Completo: Flujo de Trabajo

### Paso 1: Crear un Guía
```bash
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+506 8888-8888"
}'
```

**Respuesta:** Guarda el `id` del guía creado (ejemplo: `guide-uuid-123`)

### Paso 2: Crear o Verificar Idiomas
```bash
# Crear idioma español si no existe
curl --location 'http://localhost:3000/api/languages' \
--header 'Content-Type: application/json' \
--data '{
    "code": "es",
    "name": "Español"
}'

# Crear idioma inglés si no existe
curl --location 'http://localhost:3000/api/languages' \
--header 'Content-Type: application/json' \
--data '{
    "code": "en",
    "name": "English"
}'
```

**Respuesta:** Guarda los `id` de los idiomas (ejemplo: `lang-es-uuid`, `lang-en-uuid`)

### Paso 3: Asignar Idiomas al Guía
```bash
curl --location --request POST 'http://localhost:3000/api/guides/guide-uuid-123/languages' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": [
        "lang-es-uuid",
        "lang-en-uuid"
    ]
}'
```

### Paso 4: Verificar que los Idiomas fueron Asignados
```bash
# Obtener el guía con sus idiomas
curl --location 'http://localhost:3000/api/guides/guide-uuid-123'
```

**Respuesta esperada:**
```json
{
    "id": "guide-uuid-123",
    "name": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+506 8888-8888",
    "status": true,
    "languages": [
        {
            "id": "lang-es-uuid",
            "code": "es",
            "name": "Español"
        },
        {
            "id": "lang-en-uuid",
            "code": "en",
            "name": "English"
        }
    ]
}
```

---

## Respuestas del Endpoint

### Éxito (200 OK)
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

### Error 400: Bad Request (Formato Inválido)
```json
{
    "status": 400,
    "message": "languageIds debe ser un arreglo de UUID"
}
```

**Causa:** El campo `languageIds` no es un array, o no fue enviado.

**Ejemplo incorrecto:**
```bash
# ❌ INCORRECTO - languageIds debe ser un array
curl --location --request POST 'http://localhost:3000/api/guides/123/languages' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": "lang-uuid-1"
}'
```

**Ejemplo correcto:**
```bash
# ✅ CORRECTO - languageIds es un array
curl --location --request POST 'http://localhost:3000/api/guides/123/languages' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": ["lang-uuid-1"]
}'
```

### Error 500: Error Interno

**Causas posibles:**
- El `guide_id` no existe en la base de datos
- El `language_id` no existe en la base de datos
- Error de conexión a la base de datos

```json
{
    "status": 500,
    "message": "Error al asignar idiomas al guía"
}
```

---

## Comportamiento del Endpoint

### 1. Reemplazo Completo
Este endpoint **reemplaza** todos los idiomas existentes. Si un guía ya tiene asignados español e inglés, y envías solo portugués, el resultado será solo portugués.

**Ejemplo:**
```bash
# Estado inicial: Guía tiene [Español, Inglés]

# Envías:
{
    "languageIds": ["portugues-uuid"]
}

# Estado final: Guía tiene solo [Portugués]
```

### 2. Inserción Masiva
Si envías múltiples idiomas, todos se insertan en una sola operación (eficiente).

### 3. Manejo de Duplicados
Si envías el mismo idioma dos veces en el array, solo se inserta una vez (gracias a `ON CONFLICT DO NOTHING`).

**Ejemplo:**
```bash
# Enviar esto:
{
    "languageIds": ["es-uuid", "es-uuid", "en-uuid"]
}

# Resultado: Solo se insertan [es-uuid, en-uuid]
```

### 4. Eliminar Todos los Idiomas
Enviar un array vacío elimina todos los idiomas asignados al guía.

```bash
{
    "languageIds": []
}
```

---

## Casos de Uso Comunes

### Caso 1: Asignar Idiomas al Crear un Guía
```bash
# 1. Crear guía
POST /api/guides
{
    "fullName": "María González",
    "email": "maria@example.com"
}

# 2. Asignar idiomas inmediatamente después
POST /api/guides/{guide-id}/languages
{
    "languageIds": ["es-uuid", "en-uuid", "fr-uuid"]
}
```

### Caso 2: Actualizar Idiomas de un Guía Existente
```bash
# El guía ya tiene español e inglés, ahora también habla francés
POST /api/guides/{guide-id}/languages
{
    "languageIds": ["es-uuid", "en-uuid", "fr-uuid"]
}
```

### Caso 3: Remover un Idioma Específico
```bash
# El guía tiene [Español, Inglés, Francés]
# Para remover francés, envías solo español e inglés
POST /api/guides/{guide-id}/languages
{
    "languageIds": ["es-uuid", "en-uuid"]
}
```

### Caso 4: Remover Todos los Idiomas
```bash
POST /api/guides/{guide-id}/languages
{
    "languageIds": []
}
```

---

## Validaciones

1. **languageIds debe ser un array**: Si no es un array, retorna error 400
2. **guide_id debe existir**: Si no existe, puede generar error en la base de datos
3. **language_id debe existir**: Si un ID de idioma no existe, puede generar error de foreign key
4. **UUIDs válidos**: Los IDs deben ser UUIDs válidos

---

## Notas Importantes

1. **Reemplazo, no Adición**: Este endpoint reemplaza todos los idiomas. Si necesitas agregar sin eliminar los existentes, primero obtén los idiomas actuales, combínalos con los nuevos, y luego envía el array completo.

2. **Orden no importa**: El orden de los idiomas en el array no afecta el resultado.

3. **Duplicados**: Si envías el mismo ID múltiples veces, solo se inserta una vez.

4. **Transacción**: La operación es atómica - si hay un error, no se inserta ningún idioma.

5. **Soft Delete**: Eliminar idiomas de un guía no elimina los idiomas de la tabla `ops.language`, solo la relación.

---

## Ejemplos para Postman

### Configurar Variable de Entorno en Postman

1. Crea una variable `base_url` con valor `http://localhost:3000`
2. Crea una variable `guide_id` con el UUID de un guía
3. Crea una variable `language_id_es` con el UUID del idioma español
4. Crea una variable `language_id_en` con el UUID del idioma inglés

### Request en Postman

**URL:**
```
{{base_url}}/api/guides/{{guide_id}}/languages
```

**Method:** POST

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
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
| **Endpoint** | `POST /api/guides/:id/languages` |
| **Tabla** | `ops.guide_language` |
| **Comportamiento** | Reemplaza todos los idiomas existentes |
| **Parámetro de Path** | `id` (UUID del guía) |
| **Body** | `{ "languageIds": ["uuid1", "uuid2"] }` |
| **Respuesta** | Objeto del guía completo con sus idiomas |

