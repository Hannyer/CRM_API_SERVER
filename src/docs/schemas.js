
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

      Language: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
          code: { type: 'string', example: 'es' },
          name: { type: 'string', example: 'Español' },
        },
      },

      Guide: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
          name: { type: 'string', example: 'Juan Pérez' },
          email: { type: 'string', format: 'email', example: 'juan.perez@example.com' },
          phone: { type: 'string', nullable: true, example: '+506 8888-8888' },
          status: { type: 'boolean', example: true },
          is_leader: { type: 'boolean', example: false },
          max_party_size: { type: 'integer', nullable: true, example: 20 },
          languages: {
            type: 'array',
            items: { $ref: '#/components/schemas/Language' },
            example: [
              { id: '123e4567-e89b-12d3-a456-426614174000', code: 'es', name: 'Español' },
              { id: '223e4567-e89b-12d3-a456-426614174001', code: 'en', name: 'English' },
            ],
          },
        },
      },

      GuideListItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
          name: { type: 'string', example: 'Juan Pérez' },
          email: { type: 'string', format: 'email', example: 'juan.perez@example.com' },
          phone: { type: 'string', nullable: true, example: '+506 8888-8888' },
          status: { type: 'boolean', example: true },
          is_leader: { type: 'boolean', example: false },
          max_party_size: { type: 'integer', nullable: true, example: 20 },
        },
      },

      GuideCreateRequest: {
        type: 'object',
        required: ['fullName', 'email'],
        properties: {
          fullName: { type: 'string', example: 'Juan Pérez' },
          email: { type: 'string', format: 'email', example: 'juan.perez@example.com' },
          phone: { type: 'string', nullable: true, example: '+506 8888-8888' },
          isLeader: { type: 'boolean', example: false },
          status: { type: 'boolean', example: true },
          maxPartySize: { type: 'integer', nullable: true, example: 20 },
        },
      },

      GuideUpdateRequest: {
        type: 'object',
        properties: {
          fullName: { type: 'string', example: 'Juan Pérez' },
          email: { type: 'string', format: 'email', example: 'juan.perez@example.com' },
          phone: { type: 'string', nullable: true, example: '+506 8888-8888' },
          isLeader: { type: 'boolean', example: false },
          status: { type: 'boolean', example: true },
          maxPartySize: { type: 'integer', nullable: true, example: 20 },
        },
      },

      GuideLanguagesRequest: {
        type: 'object',
        required: ['languageIds'],
        properties: {
          languageIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            example: ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001'],
          },
        },
      },

      GuideAvailabilityItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string' },
          is_leader: { type: 'boolean' },
          is_available: { type: 'boolean' },
          languages: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },

      ErrorResponse: {
        type: 'object',
        required: ['status', 'title', 'message'],
        properties: {
          status: {
            type: 'integer',
            description: 'Código de estado HTTP',
            example: 400,
          },
          title: {
            type: 'string',
            description: 'Título descriptivo del error',
            example: 'Solicitud Inválida',
          },
          message: {
            type: 'string',
            description: 'Mensaje detallado del error',
            example: 'fullName y email son requeridos',
          },
        },
      },
    },
  },
};
