# Actualizar y Eliminar Guías con Idiomas - Ejemplos de cURL

## Descripción

Los endpoints de actualizar y eliminar guías ahora manejan los idiomas correctamente:
- **Actualizar (PUT)**: Acepta `languageIds` opcional para actualizar los idiomas del guía
- **Eliminar (DELETE)**: Elimina automáticamente las relaciones con idiomas al hacer soft delete

---

## 1. ACTUALIZAR Guía con Idiomas (PUT)

### Actualizar Solo Datos Básicos (sin tocar idiomas)

```bash
curl --location --request PUT 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Juan Pérez Actualizado",
    "email": "nuevo.email@example.com"
}'
```

**Respuesta:** Retorna el guía con sus idiomas actuales (sin cambios en idiomas)

---

### Actualizar Solo los Idiomas

```bash
curl --location --request PUT 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": [
        "lang-uuid-espanol",
        "lang-uuid-ingles"
    ]
}'
```

**Nota:** Esto **reemplaza** todos los idiomas existentes con los nuevos proporcionados.

---

### Actualizar Datos Básicos Y Idiomas

```bash
curl --location --request PUT 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Juan Pérez Modificado",
    "email": "juan.modificado@example.com",
    "phone": "+506 9999-9999",
    "status": true,
    "languageIds": [
        "lang-uuid-espanol",
        "lang-uuid-ingles",
        "lang-uuid-frances"
    ]
}'
```

---

### Eliminar Todos los Idiomas (Array Vacío)

```bash
curl --location --request PUT 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Juan Pérez",
    "languageIds": []
}'
```

**Nota:** Esto elimina todos los idiomas asociados al guía.

---

### Actualizar Solo el Nombre Manteniendo Idiomas Actuales

```bash
curl --location --request PUT 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Juan Pérez Actualizado"
}'
```

**Nota:** Si no envías `languageIds`, los idiomas actuales se mantienen sin cambios.

---

### Ejemplo Completo: Flujo de Actualización

**Paso 1:** Obtener el guía actual
```bash
curl --location 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000'
```

**Paso 2:** Actualizar nombre y agregar más idiomas
```bash
curl --location --request PUT 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Juan Pérez Actualizado",
    "languageIds": [
        "lang-uuid-espanol",
        "lang-uuid-ingles",
        "lang-uuid-portugues"
    ]
}'
```

**Paso 3:** Verificar los cambios
```bash
curl --location 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000'
```

---

## 2. ELIMINAR Guía (DELETE)

### Eliminar Guía (Soft Delete + Eliminar Relaciones)

```bash
curl --location --request DELETE 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000'
```

**Comportamiento:**
1. Cambia el `status` del guía a `false` (soft delete)
2. **Elimina todas las relaciones** en `ops.guide_language` para ese guía
3. Actualiza `updated_at` automáticamente

---

### Ejemplo con Headers

```bash
curl --location --request DELETE 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000' \
--header 'Accept: application/json, text/plain, */*' \
--header 'Authorization: Bearer fake.jwt.token'
```

---

### Respuesta del Endpoint DELETE

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

**Nota:** El guía retornado ya no tendrá idiomas asociados porque las relaciones fueron eliminadas.

---

## Casos de Uso Completos

### Caso 1: Crear Guía con Idiomas → Actualizar Idiomas → Eliminar

**Paso 1: Crear guía con idiomas**
```bash
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+506 8888-8888",
    "languageIds": [
        "lang-uuid-espanol",
        "lang-uuid-ingles"
    ]
}'
```

**Guarda el `id` del guía creado (ejemplo: `guide-uuid-123`)**

**Paso 2: Actualizar los idiomas (agregar francés)**
```bash
curl --location --request PUT 'http://localhost:3000/api/guides/guide-uuid-123' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": [
        "lang-uuid-espanol",
        "lang-uuid-ingles",
        "lang-uuid-frances"
    ]
}'
```

**Paso 3: Verificar que se actualizaron los idiomas**
```bash
curl --location 'http://localhost:3000/api/guides/guide-uuid-123'
```

**Paso 4: Eliminar el guía (elimina relaciones automáticamente)**
```bash
curl --location --request DELETE 'http://localhost:3000/api/guides/guide-uuid-123'
```

---

### Caso 2: Actualizar Solo Información Personal (Mantener Idiomas)

```bash
curl --location --request PUT 'http://localhost:3000/api/guides/guide-uuid-123' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Juan Pérez Actualizado",
    "email": "nuevo.email@example.com",
    "phone": "+506 9999-9999"
}'
```

**Resultado:** Los idiomas se mantienen sin cambios porque no se envió `languageIds`.

---

### Caso 3: Cambiar Completamente los Idiomas

```bash
# Guía tenía: [Español, Inglés]
# Cambiar a: [Portugués, Alemán]

curl --location --request PUT 'http://localhost:3000/api/guides/guide-uuid-123' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": [
        "lang-uuid-portugues",
        "lang-uuid-aleman"
    ]
}'
```

**Resultado:** Los idiomas se reemplazan completamente.

---

### Caso 4: Remover Todos los Idiomas

```bash
curl --location --request PUT 'http://localhost:3000/api/guides/guide-uuid-123' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": []
}'
```

**Resultado:** El guía queda sin idiomas asignados.

---

## Respuestas del Endpoint UPDATE

### Éxito (200 OK) - Con Idiomas Actualizados

```json
{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Juan Pérez Actualizado",
    "email": "nuevo.email@example.com",
    "phone": "+506 9999-9999",
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

### Éxito (200 OK) - Sin Cambiar Idiomas

Si no envías `languageIds`, la respuesta incluye los idiomas actuales del guía:

```json
{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Juan Pérez Actualizado",
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
```

### Error 400: languageIds debe ser un array

```json
{
    "status": 400,
    "message": "languageIds debe ser un arreglo de UUID"
}
```

**Ejemplo incorrecto:**
```bash
# ❌ INCORRECTO
curl --location --request PUT 'http://localhost:3000/api/guides/123' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": "lang-uuid-1"
}'
```

**Ejemplo correcto:**
```bash
# ✅ CORRECTO
curl --location --request PUT 'http://localhost:3000/api/guides/123' \
--header 'Content-Type: application/json' \
--data '{
    "languageIds": ["lang-uuid-1"]
}'
```

### Error 404: Guía no encontrado

```json
{
    "status": 404,
    "message": "Guía no encontrado"
}
```

---

## Comportamiento del Endpoint UPDATE

### 1. Campo `languageIds` Opcional
- Si **NO** envías `languageIds`: Los idiomas actuales se mantienen sin cambios
- Si envías `languageIds`: Reemplaza todos los idiomas existentes con los nuevos

### 2. Reemplazo Completo
Si envías `languageIds`, se **reemplazan** todos los idiomas existentes. No se agregan a los existentes.

### 3. Array Vacío
Si envías `languageIds: []`, se eliminan todos los idiomas del guía.

### 4. Actualización Atómica
Los cambios en los datos básicos y los idiomas se realizan en secuencia, pero si hay un error con los idiomas, los datos básicos ya estarán actualizados.

---

## Comportamiento del Endpoint DELETE

### 1. Soft Delete
- Cambia `status` a `false` (no elimina físicamente el registro)
- Actualiza `updated_at` automáticamente

### 2. Eliminación de Relaciones
- **Elimina físicamente** todas las relaciones en `ops.guide_language` para ese guía
- Esto garantiza que no queden relaciones huérfanas

### 3. Transacción
La eliminación se realiza en una transacción:
- Si hay un error al eliminar las relaciones, se hace rollback
- Si hay un error al actualizar el guía, se hace rollback

---

## Resumen de Endpoints

| Método | Endpoint | Manejo de Idiomas |
|--------|----------|-------------------|
| **POST** | `/api/guides` | ✅ Acepta `languageIds` opcional |
| **PUT** | `/api/guides/:id` | ✅ Acepta `languageIds` opcional (reemplaza existentes) |
| **DELETE** | `/api/guides/:id` | ✅ Elimina relaciones automáticamente |

---

## Ejemplos Rápidos

### Actualizar con Headers Completo
```bash
curl --location --request PUT 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000' \
--header 'Content-Type: application/json' \
--header 'Accept: application/json, text/plain, */*' \
--header 'Authorization: Bearer fake.jwt.token' \
--data '{
    "fullName": "Juan Pérez Actualizado",
    "languageIds": ["lang-uuid-1", "lang-uuid-2"]
}'
```

### Eliminar con Headers Completo
```bash
curl --location --request DELETE 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000' \
--header 'Accept: application/json, text/plain, */*' \
--header 'Authorization: Bearer fake.jwt.token'
```

---

## Tips para Postman

### Variables de Entorno

Crea estas variables en Postman:
- `base_url`: `http://localhost:3000`
- `guide_id`: UUID de un guía de prueba
- `language_id_es`: UUID del idioma español
- `language_id_en`: UUID del idioma inglés

### Request UPDATE en Postman

**URL:**
```
{{base_url}}/api/guides/{{guide_id}}
```

**Method:** PUT

**Headers:**
```
Content-Type: application/json
Authorization: Bearer fake.jwt.token
```

**Body (raw JSON):**
```json
{
    "fullName": "Juan Pérez Actualizado",
    "email": "nuevo.email@example.com",
    "languageIds": [
        "{{language_id_es}}",
        "{{language_id_en}}"
    ]
}
```

### Request DELETE en Postman

**URL:**
```
{{base_url}}/api/guides/{{guide_id}}
```

**Method:** DELETE

**Headers:**
```
Authorization: Bearer fake.jwt.token
```

---

## Notas Importantes

1. **Actualización de Idiomas**: El endpoint PUT reemplaza todos los idiomas existentes cuando se proporciona `languageIds`. Si quieres mantener los existentes y agregar nuevos, primero obtén los idiomas actuales, combínalos con los nuevos, y luego envía el array completo.

2. **Eliminación de Relaciones**: Al eliminar un guía (soft delete), se eliminan físicamente todas sus relaciones con idiomas. Esto no se puede deshacer fácilmente.

3. **Validación**: `languageIds` debe ser un array válido de UUIDs. Si no es un array, recibirás un error 400.

4. **Retrocompatibilidad**: Los endpoints siguen funcionando sin `languageIds`, manteniendo compatibilidad con código existente.

5. **Orden de Operaciones**:
   - **UPDATE**: Primero actualiza datos básicos, luego idiomas si se proporcionan
   - **DELETE**: Primero elimina relaciones, luego hace soft delete del guía

