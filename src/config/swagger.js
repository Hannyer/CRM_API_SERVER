const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const schemas = require('../docs/schemas');

const definition = {
  openapi: '3.0.0',
  info: {
    title: 'CRM API',
    version: '1.0.0',
    description: 'API para CRM con autenticación y configuración',
  },
  servers: [
    { url: process.env.SWAGGER_SERVER_URL || 'http://localhost:3000' },
  ],
  ...schemas,
};

const options = {
  definition,
  apis: [
    path.join(__dirname, '../routes/**/*.js'),
    path.join(__dirname, '../controllers/**/*.js'),
  ],
};

const specs = swaggerJsdoc(options);
module.exports = { specs };
