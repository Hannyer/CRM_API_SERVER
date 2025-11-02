
module.exports = {
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },

    schemas: {
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'usuario@correo.com' },
          password: { type: 'string', example: '123456' },
        },
      },

      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          user: {
            type: 'object',
            properties: {
              ID_User: { type: 'number', example: 1 },
              Name: { type: 'string', example: 'Hannyer Pitterson' },
              Email: { type: 'string', example: 'usuario@correo.com' },
              isexternal: { type: 'boolean', example: false },
            },
          },
        },
      },
    },
  },
};
