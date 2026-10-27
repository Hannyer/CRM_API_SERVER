const { AppError } = require('./AppError');

/**
 * Mapeo de códigos de estado HTTP a títulos descriptivos
 */
const STATUS_TITLES = {
  400: 'Solicitud Inválida',
  401: 'No Autorizado',
  403: 'Prohibido',
  404: 'No Encontrado',
  409: 'Conflicto',
  422: 'Entidad No Procesable',
  500: 'Error Interno del Servidor',
};

/**
 * Obtiene el título del error basado en el código de estado
 * @param {number} status - Código de estado HTTP
 * @returns {string} - Título del error
 */
function getErrorTitle(status) {
  return STATUS_TITLES[status] || 'Error';
}

/**
 * Formatea un error en una estructura consistente
 * @param {Error|AppError|object} error - Error a formatear
 * @param {number} defaultStatus - Estado HTTP por defecto si no se proporciona
 * @param {string} defaultMessage - Mensaje por defecto si no se proporciona
 * @returns {object} - Objeto con estructura { status, title, message }
 */
/**
 * Errores que vienen de PostgreSQL y que en realidad son culpa del dato
 * enviado, no del servidor. Sin esto respondian 500 y parecian caidas:
 * por ejemplo un identificador que no es UUID, o un texto mas largo que
 * la columna.
 */
const ERRORES_POSTGRES = {
  '22P02': [400, 'Alguno de los datos enviados tiene un formato inválido.'],
  '22003': [400, 'Un valor numérico está fuera del rango permitido.'],
  '22001': [400, 'Uno de los textos enviados supera el largo permitido.'],
  '23502': [400, 'Falta un dato obligatorio.'],
  '23503': [400, 'El registro referenciado no existe.'],
  '23505': [409, 'Ya existe un registro con esos datos.'],
  '23514': [400, 'Los datos no cumplen una regla de validación.'],
};

function formatError(error, defaultStatus = 500, defaultMessage = 'Ha ocurrido un error') {
  let status = defaultStatus;
  let message = defaultMessage;

  const pg = error && typeof error === 'object' && ERRORES_POSTGRES[error.code];
  if (pg && !(error instanceof AppError)) {
    return { status: pg[0], title: getErrorTitle(pg[0]), message: pg[1] };
  }

  if (error instanceof AppError) {
    status = error.status || defaultStatus;
    message = error.message || defaultMessage;
  } else if (error instanceof Error) {
    message = error.message || defaultMessage;
    // Intentar inferir el status del mensaje
    if (String(error.message).toLowerCase().includes('unique') || 
        String(error.message).toLowerCase().includes('duplicate')) {
      status = 409;
    } else if (String(error.message).toLowerCase().includes('not found') ||
               String(error.message).toLowerCase().includes('no encontrado')) {
      status = 404;
    } else if (String(error.message).toLowerCase().includes('invalid') ||
               String(error.message).toLowerCase().includes('requerido')) {
      status = 400;
    }
  } else if (typeof error === 'object' && error !== null) {
    status = error.status || defaultStatus;
    message = error.message || defaultMessage;
  } else if (typeof error === 'string') {
    message = error;
  }

  if (status >= 500 && !(error instanceof AppError)) message = defaultMessage;
  return { status, title: getErrorTitle(status), message };
}

/**
 * Envía una respuesta de error formateada
 * @param {object} res - Objeto response de Express
 * @param {Error|AppError|object|string} error - Error a formatear
 * @param {number} defaultStatus - Estado HTTP por defecto
 * @param {string} defaultMessage - Mensaje por defecto
 */
function sendErrorResponse(res, error, defaultStatus = 500, defaultMessage = 'Ha ocurrido un error') {
  const formatted = formatError(error, defaultStatus, defaultMessage);
  return res.status(formatted.status).json({
    status: formatted.status,
    title: formatted.title,
    message: formatted.message,
  });
}

module.exports = {
  formatError,
  sendErrorResponse,
  getErrorTitle,
  STATUS_TITLES,
};

