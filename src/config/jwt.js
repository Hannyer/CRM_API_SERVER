// Configuracion del secreto para firmar/verificar JWT.
//
// ESTADO ACTUAL: MODO PERMISIVO (temporal).
// Si falta JWT_SECRET se usa un valor por defecto para que el API no deje de
// arrancar en produccion. Eso es INSEGURO: ese valor esta publicado en este
// repositorio, asi que cualquiera puede forjar un token de administrador.
//
// PENDIENTE (ver PENDIENTES.md -> "Empezar por aca"):
//   1. Setear JWT_SECRET en Render (y en cualquier otro ambiente).
//   2. Setear JWT_STRICT=true para que el server se niegue a arrancar sin el.
//      No hace falta tocar codigo: los dos pasos son variables de entorno.
// Ojo: al cambiar el secreto se invalidan las sesiones activas y todos los
// usuarios tienen que iniciar sesion una vez mas.

const FALLBACK_INSEGURO = 'super-secret-default-key';

// Con JWT_STRICT=true el arranque falla si JWT_SECRET falta o es inseguro.
const STRICT = String(process.env.JWT_STRICT || '').trim().toLowerCase() === 'true';

const INSECURE_VALUES = new Set([
  FALLBACK_INSEGURO,
  'secret',
  'changeme',
  'jwt_secret',
  'test',
]);

const configurado = String(process.env.JWT_SECRET || '').trim();
let JWT_SECRET = configurado;

if (!configurado) {
  if (STRICT) {
    throw new Error(
      '[CONFIG] Falta la variable de entorno JWT_SECRET (JWT_STRICT=true). ' +
      'Generela con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
  }
  JWT_SECRET = FALLBACK_INSEGURO;
  console.error(
    '[SEGURIDAD] JWT_SECRET no esta definido: se estan firmando los tokens con ' +
    'un valor por defecto PUBLICO. Cualquiera puede falsificar una sesion de ' +
    'administrador. Setee JWT_SECRET en las variables de entorno cuanto antes.'
  );
} else if (INSECURE_VALUES.has(configurado.toLowerCase())) {
  const msg =
    '[SEGURIDAD] JWT_SECRET tiene un valor por defecto conocido y publico. ' +
    'Genere un secreto aleatorio propio.';
  if (STRICT) throw new Error('[CONFIG] ' + msg);
  console.error(msg);
} else if (configurado.length < 32) {
  console.warn(
    '[CONFIG] Advertencia: JWT_SECRET es corto (menos de 32 caracteres). ' +
    'Se recomienda una cadena aleatoria de 64 caracteres o mas.'
  );
}

module.exports = { JWT_SECRET };
