// Configuracion y validacion del secreto para firmar/verificar JWT.
// Se valida al cargar el modulo: si falta o es inseguro, el servidor NO arranca.

const INSECURE_VALUES = new Set([
  'super-secret-default-key',
  'secret',
  'changeme',
  'jwt_secret',
  'test',
]);

const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();

if (!JWT_SECRET) {
  throw new Error(
    '[CONFIG] Falta la variable de entorno JWT_SECRET. ' +
    'Defina JWT_SECRET con una cadena aleatoria larga antes de iniciar el servidor. ' +
    'Puede generarla con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  );
}

if (INSECURE_VALUES.has(JWT_SECRET.toLowerCase())) {
  throw new Error(
    '[CONFIG] JWT_SECRET tiene un valor por defecto conocido y publico. ' +
    'Genere un secreto aleatorio propio; de lo contrario cualquiera puede falsificar tokens.'
  );
}

if (JWT_SECRET.length < 32) {
  console.warn(
    '[CONFIG] Advertencia: JWT_SECRET es corto (menos de 32 caracteres). ' +
    'Se recomienda una cadena aleatoria de 64 caracteres o mas.'
  );
}

module.exports = { JWT_SECRET };
