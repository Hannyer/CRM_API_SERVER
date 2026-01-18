# 🎯 Propósito y Funcionalidades de la Aplicación

## 📌 Descripción General

**CRM_API_SERVER** es un **Sistema de Gestión de Operaciones y Planificación de Actividades Turísticas** diseñado para empresas que ofrecen tours y actividades turísticas. El sistema permite gestionar de manera integral todas las operaciones relacionadas con la planificación, reservas, asignación de recursos y administración de comisiones.

---

## 🎯 Propósito Principal

El sistema está diseñado para automatizar y optimizar la gestión de un **negocio de turismo operativo** que necesita:

1. **Planificar actividades turísticas** con horarios, capacidades y asignación de recursos
2. **Gestionar reservas** de clientes con control de disponibilidad y comisiones
3. **Administrar recursos humanos** (guías turísticos) y transporte
4. **Controlar comisiones** de agencias socias y generar reportes
5. **Operar con diferentes niveles de acceso** (administradores y operadores)

---

## 🏗️ Arquitectura del Sistema

### Tipo de Aplicación
- **Backend API REST** construida con **Node.js** y **Express**
- **Base de datos**: **PostgreSQL** con esquema `ops`
- **Arquitectura**: Patrón MVC (Model-View-Controller) con capas separadas:
  - **Routes** → **Controllers** → **Services** → **Repository** → **Database**

### Usuarios del Sistema

1. **Administrador** (`admin`)
   - Gestión completa del sistema
   - Crear/modificar/eliminar actividades, guías, compañías
   - Configurar parámetros del sistema
   - Acceso a todas las funcionalidades

2. **Operador** (`operador`)
   - Gestión limitada principalmente a operaciones
   - Crear y gestionar reservas
   - Consultar disponibilidad
   - Acceso restringido a configuración

---

## 🎨 Funcionalidades Principales

### 1️⃣ **Gestión de Actividades Turísticas**

#### 1.1 Tipos de Actividades
- **Canopy**, **Cabalgata**, **Tubing**, **Senderismo**, etc.
- Cada tipo puede tener descripción y estado activo/inactivo

#### 1.2 Actividades
- Crear actividades vinculadas a un tipo específico
- Asignar múltiples idiomas por actividad (Español, Inglés, etc.)
- Configurar tamaño de grupo esperado (`party_size`)
- Estado activo/inactivo para control operativo

#### 1.3 Planificación de Horarios (Schedule)
- **Inserción masiva de horarios** para un rango de fechas
  - Ejemplo: Del 1 al 10 de marzo, 2 veces al día (08:00-11:00, 13:00-16:00)
- **Capacidad por horario** (no por día)
  - Cada horario tiene su propia capacidad máxima
  - Control de disponibilidad en tiempo real
- **Prevención de solapamientos**
  - Validación automática para evitar conflictos de horarios
  - Reporte de conflictos antes de insertar

#### 1.4 Control de Capacidad y Reservas
- `capacity`: Capacidad máxima por horario
- `booked_count`: Contador de personas reservadas
- **Prevención de sobreventa** con bloqueo transaccional (`FOR UPDATE`)
- Consulta de espacios disponibles en tiempo real

---

### 2️⃣ **Gestión de Reservas (Bookings)**

#### 2.1 Crear Reservas
- **Búsqueda por número de referencia** (ID de reserva)
- **Datos del cliente**:
  - Nombre del cliente
  - Email y teléfono (opcionales)
- **Asignación de actividad y horario**:
  - Selección de actividad turística
  - Selección de horario específico
  - Clasificación de pasajeros (adultos/niños - usando `number_of_people` y `passenger_count`)

#### 2.2 Gestión de Comisiones
- **Compañías/Agencias (Socios)**:
  - Cada compañía tiene un porcentaje de comisión parametrizado
  - La comisión puede aplicarse automáticamente o manualmente
  - Reportes de comisiones por período
- **Control de comisiones**:
  - Opción para indicar si la reserva lleva comisión o no
  - Comisión manual o automática según la compañía asociada

#### 2.3 Transporte
- **Indicador de transporte** (sí/no)
- **Asignación de unidades de transporte**:
  - Lista de unidades disponibles con capacidad
  - Información de modelo y estado operativo
  - Control de disponibilidad de unidades
- **Pasajeros para transporte** (`passenger_count`) separado del total de personas

#### 2.4 Estados de Reserva
- `pending`: Pendiente de confirmación
- `confirmed`: Confirmada
- `cancelled`: Cancelada

#### 2.5 Reportes Automáticos
- Reportes por número de clientes
- Reportes por día y horario
- Reportes periódicos de pago de comisiones

---

### 3️⃣ **Gestión de Recursos Humanos (Guías)**

#### 3.1 Registro de Guías
- Información básica: nombre, email, teléfono
- Clasificación: **Guías Líderes** vs **Guías Normales**
- Estado activo/inactivo

#### 3.2 Asignación de Guías a Actividades
- **Asignación automática**:
  - El sistema asigna automáticamente un guía líder por grupo
  - Asignación basada en cantidad de personas
- **Asignación manual**:
  - Los administradores pueden editar manualmente la rotación de guías
  - Reemplazo completo de asignaciones
- **Validación**: Solo un líder por actividad (constraint `uq_one_leader_per_activity`)

#### 3.3 Consulta de Disponibilidad
- **Guías disponibles por fecha**:
  - Consulta de disponibilidad para una fecha específica
  - Filtro por tipo de actividad
  - Filtro por idiomas requeridos
- **Indicación de ocupados/libres**:
  - Ver qué guías están ocupados o libres en una fecha

---

### 4️⃣ **Gestión de Transporte**

#### 4.1 Unidades de Transporte
- **Registro de unidades**:
  - Capacidad de pasajeros
  - Modelo del vehículo
  - Estado operativo (activo/fuera de circulación)
  - Estado general del registro (soft delete)

#### 4.2 Control de Disponibilidad
- Visualización de unidades disponibles
- Asignación a reservas cuando se requiere transporte
- Control de capacidad vs pasajeros

---

### 5️⃣ **Gestión de Compañías (Agencias/Socios)**

#### 5.1 Registro de Compañías
- Nombre de la compañía/agencia
- Porcentaje de comisión (0-100%)
- Estado activo/inactivo

#### 5.2 Asociación con Reservas
- Las reservas pueden estar vinculadas a una compañía
- Comisión automática según la compañía o manual
- Reportes de comisiones por compañía

---

### 6️⃣ **Sistema de Autenticación y Seguridad**

#### 6.1 Login
- Autenticación mediante email y contraseña
- Contraseñas encriptadas con AES-128-CBC (compatible con C#)
- Validación de estado del usuario (activo/inactivo)

#### 6.2 Roles y Permisos
- `admin`: Acceso completo
- `operador`: Acceso limitado principalmente a operaciones

---

## 📊 Características Técnicas Destacadas

### 🔐 Seguridad
- Contraseñas encriptadas con algoritmo compatible con sistemas legacy
- Validación de permisos por rol
- Soft delete en lugar de eliminación física de registros

### ⚡ Rendimiento
- Índices optimizados en campos frecuentemente consultados
- Consultas eficientes con paginación
- Funciones SQL para operaciones complejas

### 🔄 Transacciones
- Uso de transacciones SQL para operaciones críticas
- Prevención de sobreventa con bloqueo `FOR UPDATE`
- Validación de integridad de datos

### 📅 Gestión de Tiempo
- Soporte para proyección de horarios hasta 5 años
- Validación de solapamientos de horarios
- Consultas por fecha y rango de fechas

---

## 🎯 Casos de Uso Principales

### Caso 1: Planificar Actividades para una Semana
```
1. Administrador crea actividad "Canopy Tour"
2. Selecciona tipo "Canopy"
3. Asigna idiomas: Español, Inglés
4. Programa horarios masivamente:
   - Del 1 al 7 de marzo
   - Dos horarios diarios: 08:00-11:00 y 13:00-16:00
   - Capacidad: 20 personas por horario
5. Sistema valida que no haya solapamientos
6. Se crean 14 horarios automáticamente (7 días × 2 horarios)
```

### Caso 2: Crear una Reserva Completa
```
1. Operador busca disponibilidad para "Canopy Tour" el 5 de marzo
2. Sistema muestra horarios disponibles con espacios libres
3. Cliente: "Juan Pérez", 3 personas (2 adultos, 1 niño)
4. Asocia agencia "Aventura Tours" (comisión 15%)
5. Solicita transporte (2 pasajeros)
6. Sistema valida disponibilidad y crea reserva
7. Actualiza contador de reservas automáticamente
```

### Caso 3: Asignar Guías a una Actividad
```
1. Administrador consulta guías disponibles para el 5 de marzo
2. Filtra por tipo "Canopy" e idiomas "Español, Inglés"
3. Sistema muestra guías disponibles y ocupados
4. Asigna:
   - 1 guía líder (automático según cantidad de personas)
   - 2 guías normales
5. Sistema valida que solo haya un líder
6. Guarda asignación
```

### Caso 4: Generar Reporte de Comisiones
```
1. Administrador consulta reservas por compañía
2. Filtra por período: marzo 2024
3. Sistema calcula comisiones:
   - Total de reservas por compañía
   - Porcentaje aplicado
   - Monto de comisión total
4. Genera reporte para pago
```

---

## 📋 Módulos del Sistema

### ✅ Implementados y Funcionales

1. ✅ **Autenticación** (`/api/auth`)
   - Login con email y contraseña

2. ✅ **Actividades** (`/api/activities`)
   - CRUD completo de actividades
   - Inserción masiva de horarios
   - Consulta de disponibilidad
   - Suma de asistentes con validación de capacidad

3. ✅ **Reservas** (`/api/bookings`)
   - Crear reservas con validaciones
   - Consulta de disponibilidad
   - Gestión de estados

4. ✅ **Guías** (`/api/guides`)
   - CRUD de guías
   - Consulta de disponibilidad por fecha
   - Asignación a actividades

5. ✅ **Compañías** (`/api/companies`)
   - CRUD de compañías/agencias
   - Gestión de comisiones

6. ✅ **Transporte** (`/api/transport`)
   - CRUD de unidades de transporte
   - Control de disponibilidad

7. ✅ **Configuración** (`/api/config`)
   - Parámetros del sistema

8. ✅ **Usuarios** (`/api/users`)
   - Gestión de usuarios del sistema

---

## 🎓 Resumen Ejecutivo

**CRM_API_SERVER** es una solución completa para la **gestión operativa de empresas de turismo** que permite:

✅ **Planificar** actividades con múltiples horarios y capacidades  
✅ **Reservar** actividades con control de disponibilidad en tiempo real  
✅ **Asignar** recursos (guías y transporte) eficientemente  
✅ **Administrar** comisiones de agencias socias  
✅ **Controlar** acceso mediante roles de usuario  
✅ **Reportar** información operativa y financiera  

El sistema está diseñado para escalar y manejar operaciones diarias de un negocio de turismo, desde la planificación hasta la ejecución y el reporte de comisiones.

---

## 📞 Documentación Adicional

Para más detalles técnicos, consulta:
- `ANALISIS_PROYECTO.md`: Análisis técnico completo
- `scripts/README_CAPACITY_MIGRATION.md`: Sistema de capacidad y reservas
- Swagger UI: Documentación interactiva de endpoints


