# CoreLink — Evaluación previa a la comercialización
_Fecha: 2026-09-15 · Evaluado contra `main` (`e756d62`) y contra producción (`crm-api-server-kpin.onrender.com`)_

> **Veredicto: todavía no está listo para vender.**
> El núcleo funcional es sólido. Lo que falta es seguridad y operación: aproximadamente
> **una semana de trabajo**, sin rediseñar nada. Hay además **una decisión estratégica**
> (¿una instalación por cliente o multi-tenant?) que conviene tomar **antes** del primer contrato.

---

## ✅ Lo que sí está bien

No es menor y conviene tenerlo presente:

- **Arquitectura limpia** por capas: rutas → controladores → servicios → repositorio → pool.
- **Cupos correctos.** Los dos huecos de sobreventa están cerrados y verificados:
  47/47 pruebas end-to-end y 4/4 escenarios de concurrencia (2, 5 y 10 peticiones simultáneas).
- **Concurrencia bien resuelta**: `createBooking` usa transacción con `SELECT ... FOR UPDATE`.
- Comisiones, reportes, asignaciones de guía/chofer y los feeds de calendario `.ics` funcionan.

**El producto hace lo que promete. El problema está en el perímetro, no en el centro.**

---

## 🔴 Bloqueantes — no se debería vender con esto abierto

### 1. Cualquiera puede entrar como administrador
La llave con que se firman los tokens (`'super-secret-default-key'`) está **publicada en este
repositorio** y `JWT_SECRET` no está seteado en Render. **Verificado el 2026-09-15**: se firmó
un token con esa llave y producción lo aceptó (`GET /api/companies` → HTTP 200).

**Arreglo:** ~10 minutos. Setear `JWT_SECRET` y `JWT_STRICT=true` en Render.
Ver los pasos en `PENDIENTES.md` → "Empezar por acá".
**Costo:** todos los usuarios deben iniciar sesión una vez más.

### 2. Las contraseñas se pueden descifrar
En `src/utils/crypto-compat.js` las contraseñas no están *hasheadas*, están *cifradas*
con AES-128-CBC y **todos los parámetros están en el repositorio**:

    PASS_BASE  = 'HotelMalibu'         <- la llave
    SALT_ASCII = 's@lAvz'              <- el salt
    ITERATIONS = 1                     <- una sola iteración de MD5
    IV_ASCII   = '@1B2c3D4e5F6g7H8'    <- IV fijo para todos los usuarios

Consecuencias:
- Cualquiera con el repo y lectura a la base obtiene **todas las contraseñas en texto plano**.
- Con IV fijo, dos usuarios con la misma contraseña producen **el mismo texto cifrado**:
  se ve quién comparte clave sin descifrar nada.
- Vendiendo el sistema, son contraseñas de *clientes*, que la gente reutiliza en correo y banco.

**Arreglo:** migrar a bcrypt o argon2. **Ventaja del estado actual:** como el cifrado es
reversible, se puede migrar todo de una sola pasada (descifrar → hashear → guardar),
sin esperar a que cada usuario vuelva a entrar. Es un script de una corrida.
**Esfuerzo:** ~1 día contando pruebas.

### 3. Base compartida y conexión como superusuario
El mismo PostgreSQL aloja `ops` (CoreLink), `adm` (facturación) e `inv` (**inventario médico**).
El API conecta como **`postgres`**, superusuario, con `bypassrls = true`.
Una sola inyección SQL en CoreLink abre los tres esquemas — incluida data que probablemente
pertenece a un tercero.

**Arreglo:** rol de base dedicado con permisos solo sobre `ops`. **Esfuerzo:** ~medio día.

### 4. CORS abierto de par en par
En `app.js:10` hay `app.use(cors())` sin restricción. La lista blanca de `app.js:23` está
**después** de montar las rutas, así que nunca se aplica. Cualquier sitio web puede llamar
al API desde el navegador de un usuario con sesión abierta.

**Arreglo:** dejar solo la allowlist y moverla antes de las rutas. **Esfuerzo:** ~15 minutos.

---

## 🧭 Decisión estratégica: ¿un cliente o muchos?

**El sistema hoy es de un solo cliente.** De las 24 tablas de `ops`, **ninguna** tiene columna
de tenant/organización. (`booking.company_id` es la agencia que cobra comisión, no el dueño
de los datos.)

Vender a cinco operadores turísticos significa hoy **cinco despliegues y cinco bases**:
cada actualización cinco veces, cada bug cinco veces.

- Si el plan es **pocas instalaciones caras** → está bien así, solo hay que industrializar el despliegue.
- Si el plan es **SaaS con muchos clientes** → agregar multi-tenancy *después*, con datos
  reales adentro, cuesta muchísimo más que hacerlo ahora.

**Conviene decidirlo antes de firmar el primer contrato.**

---

## 🟠 Lo demás que falta

| Tema | Estado | Esfuerzo |
|---|---|---|
| Ambiente de pruebas (staging) | **No hay.** Se desarrolla contra la base de producción. | ~1 día |
| Pruebas automatizadas | **Ninguna.** Las E2E existentes viven en una carpeta temporal. | ~2-3 días |
| Límite de intentos de login | **No hay** (`express-rate-limit` no está instalado). Se puede probar contraseñas sin freno. | ~1 hora |
| `helmet` (cabeceras HTTP) | **No está** | ~15 min |
| Bitácora de auditoría | **No hay tabla.** Sí hay 19 columnas `updated_by`/`updated_at` sueltas. | ~1 día |
| `NODE_TLS_REJECT_UNAUTHORIZED=0` | Activo; desactiva la validación de certificados de todo el proceso | ~5 min |
| Datos de prueba en producción | ~38 reservas `ZZZ_TEST_CLAUDE` (ver `LIMPIEZA.sql`) | ~10 min |
| Respaldos | **Por confirmar** — depende del plan de Supabase. **Probar una restauración real antes de vender.** | ~medio día |
| Token en `localStorage` | Vulnerable a XSS, sin refresh token | ~1 día |

---

## 📋 Plan sugerido

### Antes del primer cliente (~1 semana)
1. `JWT_SECRET` + `JWT_STRICT=true` en Render
2. CORS: dejar solo la allowlist, antes de las rutas
3. Quitar `NODE_TLS_REJECT_UNAUTHORIZED=0`
4. Migrar contraseñas a bcrypt (script de una pasada)
5. Rol de base dedicado, solo sobre `ops`
6. `helmet` + límite de intentos de login
7. Ejecutar `LIMPIEZA.sql`
8. Confirmar respaldos y **probar una restauración**

### Primeras semanas (~2)
9. Ambiente de staging
10. Pruebas automatizadas de lo que cuesta plata si falla: cupos, comisiones, solapamiento de horarios, un solo líder por actividad
11. Bitácora de auditoría

### En paralelo
12. Decidir el modelo comercial (una instalación por cliente vs. multi-tenant)

---

## Cómo se verificó esto

- Token forjado con la llave pública contra producción → aceptado (HTTP 200).
- `information_schema` sobre `ops`: 24 tablas, 0 con columna de tenant.
- `package.json`: sin `helmet`, `express-rate-limit`, `bcrypt`, `argon2`, ni framework de pruebas.
- `app.js`: `cors()` abierto en la línea 10, allowlist en la 23 (después de las rutas).
- `src/utils/crypto-compat.js`: parámetros criptográficos en claro.
- Suites E2E: 47/47 y 36/40 (las 4 fallas son conocidas y esperadas).
