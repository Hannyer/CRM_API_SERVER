# Análisis del Proyecto - Sistema de Gestión de Operaciones Turísticas

## 📋 Resumen del Análisis

Este documento describe la estructura del proyecto, la base de datos y las modificaciones realizadas para optimizar el sistema de login.

---

## 🗄️ Estructura de la Base de Datos

### Esquema Principal: `ops`

El proyecto utiliza PostgreSQL con un esquema llamado `ops` que contiene todas las tablas del sistema.

### Tablas Principales

#### 1. **Catálogos Básicos**

- **`activity_type`**: Tipos de actividades turísticas (Canopy, Cabalgata, Tubing, Senderismo)
  - `id` (UUID), `name`, `description`, `status`, `created_at`, `updated_at`

- **`language`**: Idiomas disponibles (Español, Inglés)
  - `id` (UUID), `code`, `name`, `status`, `created_at`, `updated_at`

- **`guide`**: Guías turísticos
  - `id` (UUID), `name`, `email`, `phone`, `is_leader`, `status`, `created_at`, `updated_at`

- **`company`**: Compañías/Agencias (socios) con comisiones
  - `id` (UUID), `name`, `commission_percentage`, `status`, `created_at`, `updated_at`

- **`transport`**: Unidades de transporte
  - `id` (UUID), `capacity`, `model`, `operational_status`, `status`, `created_at`, `updated_at`

- **`app_user`**: Usuarios del sistema (para autenticación)
  - `id` (UUID), `email`, `full_name`, `password_hash`, `role` (admin/operador), `status`, `created_at`, `updated_at`

#### 2. **Actividades y Planificación**

- **`activity`**: Actividades turísticas
  - `id` (UUID), `activity_type_id`, `title`, `party_size`, `adult_price`, `child_price`, `senior_price`, `status`, `created_at`, `updated_at`

- **`activity_schedule`**: Horarios programados de actividades (con capacidad y reservas)
  - `id` (UUID), `activity_id`, `scheduled_start`, `scheduled_end`, `capacity`, `booked_count`, `status`, `created_at`, `updated_at`
  - **Constraints**: `check_capacity_limit`, `check_capacity_positive`

- **`activity_language`**: Relación muchos-a-muchos (Actividades ↔ Idiomas)
  - `activity_id`, `language_id`

- **`activity_assignment`**: Asignación de guías a actividades
  - `activity_id`, `guide_id`, `is_leader`
  - **Constraint**: Solo un líder por actividad (`uq_one_leader_per_activity`)

#### 3. **Reservas**

- **`booking`**: Reservas de actividades
  - `id` (UUID), `activity_schedule_id`, `company_id`, `transport_id`, `number_of_people`, `passenger_count`, `commission_percentage`, `customer_name`, `customer_email`, `customer_phone`, `transport` (boolean), `status`, `created_at`, `updated_at`, `created_by`

#### 4. **Índices**

Todos los índices están optimizados para:
- Búsquedas por estado (`status`)
- Búsquedas por fecha (`scheduled_start`, `scheduled_end`)
- Búsquedas por email de usuario
- Búsquedas por relación (foreign keys)

---

## 🔐 Sistema de Autenticación

### Cifrado de Contraseñas

El proyecto utiliza un sistema de cifrado compatible con C# usando AES-128-CBC:

- **Parámetros de cifrado** (`src/utils/crypto-compat.js`):
  - `PASS_BASE`: 'HotelMalibu'
  - `SALT_ASCII`: 's@lAvz'
  - `ITERATIONS`: 1
  - `HASH`: 'md5'
  - `IV_ASCII`: '@1B2c3D4e5F6g7H8'

### Flujo de Login

1. **Controller** (`src/controllers/auth.controller.js`):
   - Recibe `username` (email) y `password`
   - Llama a `userService.findByEmail(username)`

2. **Service** (`src/services/users.service.js`):
   - Usa `getUserByEmail(email)` del repositorio
   - Retorna el usuario con `password_hash` encriptado

3. **Repository** (`src/repository/user.repository.js`):
   - Consulta optimizada con `LIMIT 1`
   - Retorna un objeto o `null`

4. **Validación**:
   - Desencripta `password_hash` usando `decrypt()`
   - Compara con la contraseña recibida
   - Verifica que el usuario esté activo (`status = true`)

---

## ✨ Modificaciones Realizadas

### 1. Optimización del Repositorio de Usuarios

**Archivo**: `src/repository/user.repository.js`

#### Cambios:

- **Función `getUsers` mejorada**:
  - Ahora acepta filtro opcional por email
  - Retorna array de usuarios (útil para listados)
  - Si no se pasa email, retorna todos los usuarios

- **Nueva función `getUserByEmail`**:
  - Optimizada específicamente para login
  - Retorna un solo objeto o `null`
  - Usa `LIMIT 1` para mejor rendimiento
  - Validación de email vacío antes de consultar

```javascript
// Antes
async function getUsers({ email = '' }) {
  // Solo buscaba por email exacto
}

// Después
async function getUserByEmail(email) {
  // Retorna objeto o null, optimizado para login
}

async function getUsers({ email = '' } = {}) {
  // Retorna array, útil para listados con filtro opcional
}
```

### 2. Actualización del Servicio de Usuarios

**Archivo**: `src/services/users.service.js`

#### Cambios:

- **`findByEmail` optimizada**:
  - Ahora usa `getUserByEmail` directamente
  - Eliminado parámetro `opcion` que no se usaba
  - Mejor rendimiento al retornar directamente objeto o null

- **Nueva función `findAll`**:
  - Implementada para listado de usuarios
  - Usa `getUsers()` sin parámetros

```javascript
// Antes
async function findByEmail(email) {
  const list = await getUsers({ opcion: 0, email }); // opcion no se usaba
  return list?.[0] || null;
}

// Después
async function findByEmail(email) {
  if (!email) return null;
  return await getUserByEmail(email); // Directo y optimizado
}

async function findAll() {
  return await getUsers(); // Para listados
}
```

---

## 📊 Estructura del Proyecto

### Directorios Principales

```
CRM_API_SERVER/
├── src/
│   ├── config/          # Configuración (DB, Swagger)
│   ├── controllers/     # Controladores (lógica HTTP)
│   ├── repository/      # Repositorios (acceso a BD)
│   ├── routes/          # Definición de rutas
│   ├── services/        # Lógica de negocio
│   ├── utils/           # Utilidades (crypto, errores)
│   └── docs/            # Documentación Swagger
├── scripts/             # Scripts SQL de migración
├── prisma/              # Configuración Prisma (no usado actualmente)
└── package.json
```

### Flujo de Datos

```
Request → Route → Controller → Service → Repository → PostgreSQL
                ↓
            Response ← JSON
```

---

## 🔍 Funcionalidades Clave

### 1. Gestión de Actividades

- Crear actividades con tipos, idiomas y guías asignados
- Inserción masiva de horarios con validación de solapamientos
- Capacidad por horario con prevención de sobreventa

### 2. Gestión de Reservas

- Crear reservas vinculadas a horarios específicos
- Asignar compañías con comisiones
- Manejo de transporte opcional

### 3. Autenticación

- Login con email y contraseña encriptada
- Roles: `admin` y `operador`
- Validación de estado del usuario

### 4. Consultas Optimizadas

- Disponibilidad de horarios
- Guías disponibles por fecha
- Reportes de reservas

---

## 🛠️ Scripts de Base de Datos

### Scripts Disponibles

1. **`create_full_database.sql`**: Script completo para crear toda la base de datos desde cero
2. **`migrate_activity_schedule.sql`**: Migración de actividades a horarios separados
3. **`migrate_activity_schedule_capacity.sql`**: Agregar capacidad y reservas
4. **`create_bookings_table.sql`**: Tabla de reservas
5. **`create_companies_table.sql`**: Tabla de compañías
6. **`create_transport_table.sql`**: Tabla de transporte

### Ejecutar Scripts

```bash
# Crear base completa
psql -U usuario -d nombre_db -f scripts/create_full_database.sql

# Migraciones específicas
psql -U usuario -d nombre_db -f scripts/migrate_activity_schedule_capacity.sql
```

---

## ✅ Verificaciones Post-Modificación

### 1. Login Funciona Correctamente

- ✅ `getUserByEmail` retorna objeto o null
- ✅ `findByEmail` usa la nueva función optimizada
- ✅ Controller recibe el usuario correctamente
- ✅ Validación de contraseña funciona

### 2. Listado de Usuarios Funciona

- ✅ `getUsers` retorna array completo
- ✅ `findAll` implementada en servicio
- ✅ Controller usa `findAll` correctamente

### 3. Compatibilidad

- ✅ No se rompió funcionalidad existente
- ✅ Todas las dependencias actualizadas
- ✅ Sin errores de linter

---

## 📝 Notas Importantes

1. **Contraseñas**: Las contraseñas se almacenan encriptadas usando AES-128-CBC
2. **UUIDs**: Todas las tablas usan UUID como identificadores primarios
3. **Soft Delete**: Muchas tablas usan `status` boolean en lugar de eliminar registros
4. **Transacciones**: Las operaciones críticas usan transacciones SQL
5. **Índices**: Optimizados para consultas frecuentes (email, fechas, estados)

---

## 🚀 Próximos Pasos Recomendados

1. **Generar contraseña encriptada** para el usuario admin:
   ```bash
   node -e "const {encrypt}=require('./src/utils/crypto-compat'); console.log(encrypt('123'));"
   ```

2. **Actualizar script SQL** con la contraseña encriptada real

3. **Agregar índice único** en `ops.app_user.email` si no existe:
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS idx_app_user_email_unique 
   ON ops.app_user(email);
   ```

4. **Implementar JWT** real en lugar del token fake actual

5. **Agregar middleware** de autenticación para proteger rutas

---

## 📞 Soporte

Para más información sobre el proyecto, consulta:
- Scripts SQL en `scripts/`
- Documentación de endpoints en Swagger
- Controladores y servicios para lógica específica

