# CoreLink — Pendientes y próximos pasos
_Actualizado: 2026-09-14_

> Para retomar: leer la sección **"Empezar por acá"** y arrancar directo.

---

## ▶️ Empezar por acá (lo primero la próxima vez)

### 1. 🔴 `JWT_SECRET` en Render — **pendiente, requiere coordinación**
Hoy el API firma los tokens con `'super-secret-default-key'`, un valor que está **publicado en este repositorio**. Cualquiera que lo lea puede fabricarse un token de administrador contra producción. Es el riesgo más grave abierto.

Ya está todo listo en código (`src/config/jwt.js`); son **dos variables de entorno**, cero cambios de código:

1. Copiar el valor de `JWT_SECRET` del `.env` local (96 caracteres hex; el `.env` no se sube a git). Si se perdió, generar otro:
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
2. Render → el servicio → **Environment** → agregar `JWT_SECRET` con ese valor.
3. Agregar también `JWT_STRICT=true`. Eso hace que el server **se niegue a arrancar** si algún día falta el secreto, en vez de caer callado al valor inseguro.
4. Guardar (Render redespliega solo) y verificar que el login funcione.

⚠️ **Por qué no se hizo ya:** al cambiar el secreto **se invalidan todas las sesiones activas** y cada usuario debe iniciar sesión una vez más. Hay que hacerlo en un momento que no estorbe la operación.

Mientras tanto el API arranca normal y escribe en los logs de Render:
`[SEGURIDAD] JWT_SECRET no esta definido: se estan firmando los tokens con un valor por defecto PUBLICO...`

### 2. Siguiente: CORS doble en `app.js`
El `app.use(cors())` abierto de la línea ~10 gana sobre la allowlist.

### ✅ Ya resueltos
- ~~Transacción anti-sobreventa~~ — **HECHO (2026-09-14)**. `createBooking` usa `SELECT ... FOR UPDATE`. Verificado: 4/4 escenarios de concurrencia.
- ~~7 rutas sin `verifyToken`~~ — **HECHO (2026-09-14)**. Verificado: las 7 responden 401 sin token.

---

## 🔴 Seguridad (crítico)
- 🔴 **JWT_SECRET: PENDIENTE (acción manual en Render)**. El fallback público `'super-secret-default-key'` **sigue activo**: se dejó a propósito el 2026-09-14 para no tumbar producción ni forzar el re-login de todos. `src/config/jwt.js` centraliza el secreto y corre en **modo permisivo** (arranca igual, pero grita en los logs). Para cerrarlo: setear `JWT_SECRET` y `JWT_STRICT=true` en Render — ver "Empezar por acá".
- ✅ **7 rutas sin `verifyToken`: RESUELTO (2026-09-14)**. `activity-types`, `card-types`, `companies`, `config`, `languages`, `payment-types` y `security` llevan `router.use(verifyToken)`. Antes `companies` exponía el % de comisión y `security` la matriz de permisos completa sin autenticación. Verificado: las 7 devuelven 401 sin token y siguen respondiendo 200 con token. El front no se ve afectado (Login y Recuperar contraseña solo llaman `/api/auth/*`).
- **CORS**: hay dos `app.use(cors())` en `app.js`; el abierto (línea ~10) gana sobre la allowlist (después de las rutas). Dejar solo la allowlist, antes de las rutas. **← siguiente pendiente de seguridad.**
- **Contraseñas AES reversibles** (24 chars, longitud uniforme) → migrar a hash unidireccional (bcrypt/argon2), rehasheando en el próximo login exitoso.
- **`NODE_TLS_REJECT_UNAUTHORIZED=0`** global en `.env` — sobra (el pool ya usa `rejectUnauthorized:false`) y desactiva TLS de todo el proceso. Quitarlo.
- **API conecta como `postgres`** (superusuario, `bypassrls=true`) → crear rol dedicado con permisos solo sobre esquema `ops`.
- **RLS apagado** en las tablas de `ops` (y `inv`). Con Supabase, habilitar RLS si se expone PostgREST/anon key.

## 🟠 Correctitud — sobreventa / capacidad
- ✅ **Race condition al CREAR: RESUELTA (2026-09-14)**. `createBooking` abre transacción, bloquea el horario con `FOR UPDATE` y revalida el cupo dentro. Probado con 2, 5 y 10 peticiones simultáneas: 0 sobreventas.
- ✅ **Sobreventa al EDITAR: RESUELTA (2026-09-14)**. `availableSpaces` llegaba como texto y `+=` concatenaba ("8"+2="82"), así que no bloqueaba. Se fuerza a número.
- ⚠️ **Pendiente menor**: `updateBooking` revalida el cupo pero **sin** transacción/bloqueo, así que dos ediciones simultáneas sobre la misma salida siguen teniendo una carrera teórica (mucho menos probable que la de crear).
- **Dos modelos de capacidad en paralelo**:
  - Vivo: `activity.party_size − SUM(reservas)` (lo que valida hoy).
  - Muerto: columnas `activity_schedule.capacity` / `booked_count` → `capacity=0` en los 113 horarios históricos (el front no manda `capacity` en el bulk) y `booked_count` nunca se incrementa. Por eso `GET /api/activities/:id/schedules/available` devuelve vacío (filtra `(capacity-booked_count)>0`).
  - Decidir cuál gana. Si se adopta `capacity` por horario: backfill (`capacity:=party_size`, `booked_count:=SUM`) **antes** de conectar el código (el CHECK `booked_count<=capacity` rechazaría si no). La función `ops.add_attendees_to_schedule` ya existe con `FOR UPDATE` pero nadie la llama.
- **`availableSpaces` viene como texto** desde `checkAvailability` (`"4"`). Ya se corrigió con `Number()` en `maxParticipantsAllowed` (BookingsPage). Revisar si hay otros lugares que sumen ese valor sin convertir.

## 🟡 Limpieza / infraestructura
- **Ejecutar `LIMPIEZA.sql`** (quedó en el scratchpad de la sesión) para borrar los datos de prueba `ZZZ_TEST_CLAUDE` cuando termine la revisión. Borra: actividad ZZZ, horarios sembrados (marzo 2027 + julio 2026 + multi-ruta + multi-horario), reservas marcadas, sus `booking_transport` y asignaciones de guía. **No toca datos reales.**
- **Sin staging**: se desarrolla contra la base de **producción** (Supabase). Montar un ambiente aparte y ordenar las migraciones (hoy son scripts sueltos en `scripts/` → carpeta `migrations/` fechada + tabla `schema_migrations`).
- **Base compartida**: los esquemas `adm` (SaaS de facturación, casi vacío) e `inv` (inventario médico) conviven con `ops`. Revisar si deben aislarse.

## 🟢 Módulo Reportes (recién hecho)
- **Visibles**: Ocupación, Comisiones, Traslados, Guías.
- **Ocultos** (para habilitar: agregar la key en `ENABLED_TABS` de `src/page/reports/ReportsPage.tsx`): `sales` (Ventas), `activities` (Actividades), `status` (Estados). El código y endpoints ya existen.
- El menú **Reportes** solo tiene permiso para **Administrador**; agregar **Operador** desde la pantalla de Seguridad si se quiere.
- Endpoints `/api/reports/*` usan `requirePermission('bookings')`. Si se quiere permiso granular, crear un permiso `reports` propio.
- **Bundle creció (~1.4 MB)** por Recharts + xlsx → hacer *code-splitting* (lazy import) del `ReportsPage`.

## 🟢 Deuda técnica frontend
- `BookingsPage.tsx` enorme (~2.700 líneas) → seguir extrayendo componentes.
- Servicios duplicados (`activityService`/`activitiesService`, `scheduleService`/`schedulesService`, `bookingsService`/`reservationService`, etc.) y **dos `apiClient`** — consolidar.
- Token en `localStorage` (vulnerable a XSS), sin manejo de refresh.
- **Sin pruebas automatizadas** (las reglas críticas: sobreventa, comisiones, solapamiento de horarios, un solo líder por actividad).
- `ops.guide` huérfana (sin FKs) pero con CRUD activo en `guides.repository.js` — split-brain con `app_user` rol Guía.

---

## 🗄️ Estado de la base de datos (cambios de esta etapa)
- **Esquema**: + columna `ops.app_user.calendar_token` (+ índice único). Migración: `scripts/migrations/2026-08-08_app_user_calendar_token.sql`.
- **Config**: fila de menú `reports` en `ops.menu` + permiso de lectura para Administrador. **Mantener.**
- **Datos de prueba**: pendientes de limpiar (ver `LIMPIEZA.sql`).

## 🚀 Deploy
- **API** → Render (`Hannyer/CRM_API_SERVER`), auto-deploy desde `main`.
- **Front** → Vercel (`Hannyer/CoreLink`), auto-deploy desde `main`.
- Ambos comparten la misma base (Supabase). No hay staging.
