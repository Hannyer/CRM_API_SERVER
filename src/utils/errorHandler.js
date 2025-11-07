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
function formatError(error, defaultStatus = 500, defaultMessage = 'Ha ocurrido un error') {
  let status = defaultStatus;
  let message = defaultMessage;

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

  return {
    status,
    title: getErrorTitle(status),
    message,
  };
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

