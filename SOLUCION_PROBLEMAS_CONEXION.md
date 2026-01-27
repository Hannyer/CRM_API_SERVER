# Solución a Problemas de Conexión PostgreSQL

## 🔍 Problemas Identificados

### Error Principal
```
Error: Connection terminated unexpectedly
at node_modules/pg-pool/index.js
```

### Causas Identificadas

1. **SSL Forzado Innecesariamente**
   - La configuración original forzaba SSL (`require: true`) incluso en desarrollo local
   - Las bases de datos locales normalmente no tienen SSL habilitado
   - Esto causaba que las conexiones se cerraran inesperadamente

2. **Timeouts Muy Cortos**
   - `connectionTimeoutMillis: 15000` (15 segundos) puede ser insuficiente
   - En redes lentas o con alta latencia, las conexiones fallan antes de establecerse

3. **Múltiples Archivos de Configuración**
   - Existían 3 archivos diferentes: `db.pg.js`, `db.js`, `pool.js`
   - Esto podía causar inconsistencias en la configuración

4. **Manejo de Errores Limitado**
   - No había logging suficiente para diagnosticar problemas
   - El pool no manejaba correctamente los errores de reconexión

---

## ✅ Soluciones Implementadas

### 1. SSL Condicional Según Entorno

**Antes:**
```javascript
ssl: { require: true, rejectUnauthorized: false }
```

**Después:**
```javascript
const getSSLConfig = () => {
  const dbUrl = process.env.DATABASE_URL || '';
  const isRemote = dbUrl.includes('render.com') || 
                   dbUrl.includes('herokuapp.com') || 
                   dbUrl.includes('sslmode=require') ||
                   process.env.NODE_ENV === 'production';
  
  // Solo usar SSL en producción/remoto
  if (isRemote) {
    return { require: true, rejectUnauthorized: false };
  }
  
  // En desarrollo local, no forzar SSL
  return false;
};
```

### 2. Timeouts Aumentados

- `connectionTimeoutMillis: 20000` (20 segundos) - Aumentado de 15s
- `statement_timeout: 30000` - Agregado para queries individuales
- `query_timeout: 30000` - Timeout para queries

### 3. Configuración Mejorada del Pool

- `max: 20` - Aumentado de 10 conexiones máximo
- `keepAlive: true` - Mantiene conexiones vivas
- `keepAliveInitialDelayMillis: 10000` - Delay inicial para keep-alive

### 4. Logging Mejorado

Ahora el pool registra:
- ✅ Conexiones establecidas
- ❌ Errores del pool
- 🔌 Conexiones removidas
- Verificación de conexión al iniciar

### 5. Función de Verificación

Se agregó `testConnection()` para verificar la conexión antes de usarla.

---

## 🛠️ Configuración Recomendada para .env

### Desarrollo Local (Sin SSL)
```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/nombre_db
NODE_ENV=development
VERIFY_DB_ON_START=true
```

### Producción/Remoto (Con SSL)
```env
DATABASE_URL=postgresql://usuario:password@host:5432/nombre_db?sslmode=require
NODE_ENV=production
VERIFY_DB_ON_START=true
```

### Para Render.com (Automático)
```env
DATABASE_URL=postgresql://usuario:password@dpg-xxx.render.com:5432/nombre_db
NODE_ENV=production
```
El sistema detectará automáticamente que es Render y usará SSL.

---

## 🔧 Pasos para Resolver Problemas

### 1. Verificar que PostgreSQL Esté Corriendo

```bash
# Windows
Get-Service postgresql*

# Linux/Mac
sudo systemctl status postgresql
```

### 2. Verificar Conexión Manual

```bash
# Usar psql para verificar
psql -U usuario -d nombre_db -h localhost

# O desde Node.js
node scripts/ping-db.js
```

### 3. Verificar Variables de Entorno

```bash
# Verificar que DATABASE_URL esté configurada
echo $DATABASE_URL

# O en Windows PowerShell
echo $env:DATABASE_URL
```

### 4. Verificar el Archivo .env

Asegúrate de que existe `.env` en la raíz del proyecto:
```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/nombre_db
PORT=3000
```

### 5. Verificar Logs del Pool

Con la nueva configuración, verás mensajes como:
- `✅ Nueva conexión a PostgreSQL establecida`
- `✅ Conexión a PostgreSQL verificada exitosamente`
- `❌ Error inesperado en el pool de PostgreSQL:` (si hay problemas)

---

## 🚨 Solución Rápida Si Persiste el Problema

### Opción 1: Deshabilitar SSL Completamente (Solo Desarrollo Local)

En `.env`:
```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/nombre_db?sslmode=disable
```

### Opción 2: Deshabilitar Verificación de Conexión Inicial

En `.env`:
```env
VERIFY_DB_ON_START=false
```

### Opción 3: Aumentar Timeouts Temporalmente

Si los problemas persisten, puedes modificar `db.pg.js`:
```javascript
connectionTimeoutMillis: 30000,  // 30 segundos
statement_timeout: 60000,        // 60 segundos
```

---

## 📊 Monitoreo del Pool

Para ver el estado del pool, puedes agregar este código temporalmente:

```javascript
// En cualquier repositorio
console.log('Pool stats:', {
  totalCount: pool.totalCount,
  idleCount: pool.idleCount,
  waitingCount: pool.waitingCount
});
```

---

## 🔍 Diagnóstico Adicional

Si los problemas persisten, verifica:

1. **Firewall**: ¿Está bloqueando el puerto 5432?
2. **Credenciales**: ¿Son correctas?
3. **Base de datos existe**: ¿La base de datos está creada?
4. **Permisos**: ¿El usuario tiene permisos para conectarse?
5. **Límites de conexión**: ¿Has alcanzado el máximo de conexiones de PostgreSQL?

```sql
-- Ver conexiones activas
SELECT count(*) FROM pg_stat_activity;

-- Ver máximo de conexiones permitidas
SHOW max_connections;
```

---

## ✅ Verificación Post-Fix

Después de aplicar los cambios:

1. Reinicia el servidor Node.js
2. Verifica los logs de conexión
3. Prueba los endpoints que estaban fallando
4. Monitorea durante unos minutos para ver si hay reconexiones

Si todo está bien, deberías ver:
```
✅ Nueva conexión a PostgreSQL establecida
✅ Conexión a PostgreSQL verificada exitosamente
✅ Server running on port 3000
```

---

## 📝 Notas Importantes

- **No mezcles** diferentes archivos de configuración de pool
- **Usa siempre** `src/config/db.pg.js` (el que está actualizado)
- **En producción**, siempre usa SSL si es posible
- **En desarrollo local**, SSL es opcional y normalmente no necesario
- Los **timeouts aumentados** ayudan pero si hay problemas de red, revisa la infraestructura

---

## 🔗 Referencias

- [Documentación de node-postgres](https://node-postgres.com/features/pooling)
- [Configuración de SSL en PostgreSQL](https://www.postgresql.org/docs/current/libpq-ssl.html)
- [Solución de problemas de conexión](https://node-postgres.com/guides/project-structure)






