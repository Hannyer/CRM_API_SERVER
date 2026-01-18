# Listar Guías con Idiomas - Actualización

## Descripción

El endpoint `GET /api/guides` ahora retorna los idiomas asociados a cada guía en la respuesta. Cada guía en el array `items` incluye un campo `languages` con la lista de idiomas que habla.

---

## Endpoint Actualizado

**GET** `/api/guides`

### Parámetros de Query
- `page` (opcional, integer, default: 1): Número de página
- `limit` (opcional, integer, default: 10): Registros por página (máximo 100)

---

## Ejemplo de cURL

### Listar Todos los Guías (con idiomas)

```bash
curl --location 'http://localhost:3000/api/guides?page=1&limit=10'
```

### Con Headers Completo (como en tu ejemplo)

```bash
curl "http://localhost:3000/api/guides?page=1&limit=10" \
  -H "Accept: application/json, text/plain, */*" \
  -H "Accept-Language: es-419,es;q=0.9,es-ES;q=0.8,en;q=0.7,en-GB;q=0.6,en-US;q=0.5,es-CR;q=0.4" \
  -H "Authorization: Bearer fake.jwt.token" \
  -H "Connection: keep-alive" \
  -H "If-None-Match: W/\"294-hMSC1Z7HD+mBJgkSJhwTQMMar2s\"" \
  -H "Origin: http://localhost:5173" \
  -H "Referer: http://localhost:5173/" \
  -H "Sec-Fetch-Dest: empty" \
  -H "Sec-Fetch-Mode: cors" \
  -H "Sec-Fetch-Site: same-site" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0"
```

### Windows PowerShell (sintaxis corregida)

```powershell
curl "http://localhost:3000/api/guides?page=1&limit=10" `
  -H "Accept: application/json, text/plain, */*" `
  -H "Authorization: Bearer fake.jwt.token"
```

---

## Respuesta del Endpoint

### Antes (sin idiomas)
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

### Ahora (con idiomas) ✨
```json
{
    "items": [
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
        },
        {
            "id": "223e4567-e89b-12d3-a456-426614174001",
            "name": "María González",
            "email": "maria.gonzalez@example.com",
            "phone": "+506 7777-7777",
            "status": true,
            "languages": [
                {
                    "id": "lang-uuid-1",
                    "code": "es",
                    "name": "Español"
                }
            ]
        },
        {
            "id": "323e4567-e89b-12d3-a456-426614174002",
            "name": "Carlos Rodríguez",
            "email": "carlos.rodriguez@example.com",
            "phone": "+506 6666-6666",
            "status": true,
            "languages": []
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

---

## Estructura de la Respuesta

### Item del Guía

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

### Campo `languages`

- **Tipo**: Array de objetos
- **Descripción**: Lista de idiomas que habla el guía
- **Valor por defecto**: Array vacío `[]` si el guía no tiene idiomas asignados
- **Orden**: Los idiomas se ordenan alfabéticamente por nombre (`ORDER BY l.name`)

### Casos Especiales

1. **Guía sin idiomas**: El campo `languages` será un array vacío `[]`
2. **Guía con un idioma**: El array tendrá un solo elemento
3. **Guía con múltiples idiomas**: El array tendrá todos los idiomas ordenados alfabéticamente

---

## Ejemplos de Uso

### Listar Primera Página (10 registros)
```bash
curl --location 'http://localhost:3000/api/guides?page=1&limit=10'
```

### Listar Segunda Página (20 registros)
```bash
curl --location 'http://localhost:3000/api/guides?page=2&limit=20'
```

### Listar Todos (máximo permitido)
```bash
curl --location 'http://localhost:3000/api/guides?page=1&limit=100'
```

### Listar sin parámetros (valores por defecto)
```bash
curl --location 'http://localhost:3000/api/guides'
```

---

## Comparación: Antes vs Ahora

### Endpoint: GET /api/guides/:id

Este endpoint **ya retornaba** los idiomas desde el principio:

```bash
curl --location 'http://localhost:3000/api/guides/123e4567-e89b-12d3-a456-426614174000'
```

**Respuesta (sin cambios):**
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
        }
    ]
}
```

### Endpoint: GET /api/guides

Este endpoint **ahora retorna** los idiomas en cada item:

**Antes:**
- ❌ No incluía idiomas en el listado
- ❌ Requería una llamada adicional por cada guía para obtener sus idiomas

**Ahora:**
- ✅ Incluye idiomas en cada item del listado
- ✅ Información completa en una sola llamada

---

## Beneficios

1. **Menos llamadas**: No necesitas hacer una llamada adicional por cada guía para obtener sus idiomas
2. **Mejor rendimiento**: Obtienes toda la información en una sola consulta
3. **Consistencia**: Tanto el listado como el detalle incluyen los idiomas
4. **Fácil filtrado**: Puedes filtrar guías por idiomas directamente en el frontend

---

## Casos de Uso

### Caso 1: Mostrar Lista de Guías con sus Idiomas

```javascript
// Frontend JavaScript
fetch('http://localhost:3000/api/guides?page=1&limit=10')
  .then(response => response.json())
  .then(data => {
    data.items.forEach(guide => {
      console.log(`${guide.name} habla: ${guide.languages.map(l => l.name).join(', ')}`);
    });
  });
```

### Caso 2: Filtrar Guías por Idioma en el Frontend

```javascript
// Filtrar guías que hablan español
fetch('http://localhost:3000/api/guides?page=1&limit=100')
  .then(response => response.json())
  .then(data => {
    const guidesSpeakingSpanish = data.items.filter(guide => 
      guide.languages.some(lang => lang.code === 'es')
    );
    console.log(guidesSpeakingSpanish);
  });
```

### Caso 3: Mostrar Badges de Idiomas

```javascript
// Mostrar badges de idiomas para cada guía
data.items.forEach(guide => {
  const languageBadges = guide.languages.map(lang => 
    `<span class="badge">${lang.name}</span>`
  ).join(' ');
  console.log(`${guide.name}: ${languageBadges}`);
});
```

---

## Notas Importantes

1. **Orden de Idiomas**: Los idiomas se ordenan alfabéticamente por nombre dentro de cada guía.

2. **Array Vacío**: Si un guía no tiene idiomas asignados, el campo `languages` será un array vacío `[]`.

3. **Rendimiento**: La consulta utiliza un subquery con `json_agg` para obtener los idiomas, lo cual es eficiente incluso con muchos registros.

4. **Compatibilidad**: La respuesta es totalmente compatible con el código existente. Simplemente se agregó el campo `languages` a cada item.

5. **Paginación**: El campo `languages` no afecta la paginación. El total de registros se cuenta solo por guías, no por idiomas.

---

## Resumen de Cambios

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Campo `languages`** | ❌ No incluido | ✅ Incluido en cada item |
| **Llamadas necesarias** | 2 (listar + obtener detalle) | 1 (listar con idiomas) |
| **Información completa** | ❌ Parcial | ✅ Completa |
| **Consistencia** | ❌ Diferente entre listado y detalle | ✅ Misma estructura |

---

## Testing

### Verificar que Funciona

```bash
# 1. Crear un guía con idiomas
curl --location 'http://localhost:3000/api/guides' \
--header 'Content-Type: application/json' \
--data '{
    "fullName": "Test Guide",
    "email": "test@example.com",
    "languageIds": ["lang-uuid-1"]
}'

# 2. Listar guías y verificar que incluye idiomas
curl --location 'http://localhost:3000/api/guides'

# Deberías ver el guía creado con el campo "languages" incluido
```

