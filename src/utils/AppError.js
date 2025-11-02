class AppError extends Error {
  /**
   * @param {string} message - Mensaje legible para el cliente
   * @param {number} status  - HTTP status (p.ej. 400, 404, 409, 422, 500)
   * @param {string} code    - Código interno estable (p.ej. NO_LEADERS_AVAILABLE)
   * @param {object} details - Datos extra opcionales (inputs, ids, etc.)
   */
  constructor(message, status = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details || undefined;
  }
}

module.exports = { AppError };
