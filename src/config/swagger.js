const swaggerJsdoc = require('swagger-jsdoc');

const PORT = process.env.PORT || 3000;
const PUBLIC_URL =
  process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

const options = {
  definition: {
    openapi: '3.0.1',
    info: {
      title: 'CRM API',
      version: '1.0.0',
      description: 'API para CRM con autenticación y configuración',
    },
    servers: [{ url: PUBLIC_URL }],
  },

  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
  ],
};

const specs = swaggerJsdoc(options);
module.exports = { specs };
