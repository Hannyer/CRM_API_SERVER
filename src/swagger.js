const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const externalUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CRM API',
      version: '1.0.0',
      description: 'API CRM con login y endpoints de configuración',
    },
    servers: [
      { url: externalUrl }
    ]
  },
  // Archivos donde documentas rutas con JSDoc o YAML
  apis: ['./src/routes/**/*.js', './src/schemas/**/*.yaml']
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };
