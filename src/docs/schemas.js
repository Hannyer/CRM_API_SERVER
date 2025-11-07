
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

      Transport: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
          capacity: { type: 'integer', example: 20, description: 'Capacidad de pasajeros' },
          model: { type: 'string', example: 'Toyota Hiace 2023' },
          operationalStatus: { type: 'boolean', example: true, description: 'true = activo, false = fuera de circulación' },
          status: { type: 'boolean', example: true, description: 'Estado general del registro' },
        },
      },

      TransportListItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
          capacity: { type: 'integer', example: 20, description: 'Capacidad de pasajeros' },
          model: { type: 'string', example: 'Toyota Hiace 2023' },
          operationalStatus: { type: 'boolean', example: true, description: 'true = activo, false = fuera de circulación' },
          status: { type: 'boolean', example: true, description: 'Estado general del registro' },
        },
      },

      TransportCreateRequest: {
        type: 'object',
        required: ['capacity', 'model'],
        properties: {
          capacity: { type: 'integer', example: 20, description: 'Capacidad de pasajeros (debe ser mayor a 0)' },
          model: { type: 'string', example: 'Toyota Hiace 2023' },
          operationalStatus: { type: 'boolean', example: true, description: 'Estado operativo (por defecto true)' },
          status: { type: 'boolean', example: true, description: 'Estado general (por defecto true)' },
        },
      },

      TransportUpdateRequest: {
        type: 'object',
        properties: {
          capacity: { type: 'integer', example: 25, description: 'Capacidad de pasajeros (debe ser mayor a 0)' },
          model: { type: 'string', example: 'Toyota Hiace 2024' },
          operationalStatus: { type: 'boolean', example: false, description: 'Estado operativo' },
          status: { type: 'boolean', example: true, description: 'Estado general' },
        },
      },

      Configuration: {
        type: 'object',
        properties: {
          pkConfiguration: { type: 'integer', format: 'int64', example: 1, description: 'ID único de la configuración' },
          estado: { type: 'integer', example: 1, description: 'Estado de la configuración (1 = activo, 0 = inactivo)' },
          description: { type: 'string', nullable: true, example: 'Descripción de la configuración' },
          observacion: { type: 'string', nullable: true, example: 'Observaciones adicionales' },
          key01: { type: 'string', nullable: true, example: 'PARAMETRO', description: 'Clave 01 (máx 50 caracteres)' },
          key02: { type: 'string', nullable: true, example: 'FUNCIONALIDAD', description: 'Clave 02 (máx 50 caracteres)' },
          key03: { type: 'string', nullable: true, example: 'MRB', description: 'Clave 03 (máx 50 caracteres)' },
          key04: { type: 'string', nullable: true, example: 'ROL', description: 'Clave 04 (máx 50 caracteres)' },
          key05: { type: 'string', nullable: true, example: 'CLIENTE', description: 'Clave 05 (máx 50 caracteres)' },
          key06: { type: 'string', nullable: true, example: 'ROLCLIENTE', description: 'Clave 06 (texto)' },
          value: { type: 'string', nullable: true, example: 'Valor de la configuración', description: 'Valor de la configuración' },
          displayName: { type: 'string', nullable: true, example: 'Nombre para mostrar', description: 'Nombre para mostrar (máx 50 caracteres)' },
        },
      },

      ConfigurationListItem: {
        type: 'object',
        properties: {
          pkConfiguration: { type: 'integer', format: 'int64', example: 1, description: 'ID único de la configuración' },
          estado: { type: 'integer', example: 1, description: 'Estado de la configuración (1 = activo, 0 = inactivo)' },
          description: { type: 'string', nullable: true, example: 'Descripción de la configuración' },
          observacion: { type: 'string', nullable: true, example: 'Observaciones adicionales' },
          key01: { type: 'string', nullable: true, example: 'PARAMETRO', description: 'Clave 01 (máx 50 caracteres)' },
          key02: { type: 'string', nullable: true, example: 'FUNCIONALIDAD', description: 'Clave 02 (máx 50 caracteres)' },
          key03: { type: 'string', nullable: true, example: 'MRB', description: 'Clave 03 (máx 50 caracteres)' },
          key04: { type: 'string', nullable: true, example: 'ROL', description: 'Clave 04 (máx 50 caracteres)' },
          key05: { type: 'string', nullable: true, example: 'CLIENTE', description: 'Clave 05 (máx 50 caracteres)' },
          key06: { type: 'string', nullable: true, example: 'ROLCLIENTE', description: 'Clave 06 (texto)' },
          value: { type: 'string', nullable: true, example: 'Valor de la configuración', description: 'Valor de la configuración' },
          displayName: { type: 'string', nullable: true, example: 'Nombre para mostrar', description: 'Nombre para mostrar (máx 50 caracteres)' },
        },
      },

      ConfigurationCreateRequest: {
        type: 'object',
        properties: {
          estado: { type: 'integer', example: 1, description: 'Estado de la configuración (por defecto 1)' },
          description: { type: 'string', nullable: true, example: 'Descripción de la configuración' },
          observacion: { type: 'string', nullable: true, example: 'Observaciones adicionales' },
          key01: { type: 'string', nullable: true, example: 'PARAMETRO', description: 'Clave 01 (máx 50 caracteres)' },
          key02: { type: 'string', nullable: true, example: 'FUNCIONALIDAD', description: 'Clave 02 (máx 50 caracteres)' },
          key03: { type: 'string', nullable: true, example: 'MRB', description: 'Clave 03 (máx 50 caracteres)' },
          key04: { type: 'string', nullable: true, example: 'ROL', description: 'Clave 04 (máx 50 caracteres)' },
          key05: { type: 'string', nullable: true, example: 'CLIENTE', description: 'Clave 05 (máx 50 caracteres)' },
          key06: { type: 'string', nullable: true, example: 'ROLCLIENTE', description: 'Clave 06 (texto)' },
          value: { type: 'string', nullable: true, example: 'Valor de la configuración', description: 'Valor de la configuración' },
          displayName: { type: 'string', nullable: true, example: 'Nombre para mostrar', description: 'Nombre para mostrar (máx 50 caracteres)' },
        },
      },

      ConfigurationUpdateRequest: {
        type: 'object',
        properties: {
          estado: { type: 'integer', example: 1, description: 'Estado de la configuración' },
          description: { type: 'string', nullable: true, example: 'Descripción de la configuración' },
          observacion: { type: 'string', nullable: true, example: 'Observaciones adicionales' },
          key01: { type: 'string', nullable: true, example: 'PARAMETRO', description: 'Clave 01 (máx 50 caracteres)' },
          key02: { type: 'string', nullable: true, example: 'FUNCIONALIDAD', description: 'Clave 02 (máx 50 caracteres)' },
          key03: { type: 'string', nullable: true, example: 'MRB', description: 'Clave 03 (máx 50 caracteres)' },
          key04: { type: 'string', nullable: true, example: 'ROL', description: 'Clave 04 (máx 50 caracteres)' },
          key05: { type: 'string', nullable: true, example: 'CLIENTE', description: 'Clave 05 (máx 50 caracteres)' },
          key06: { type: 'string', nullable: true, example: 'ROLCLIENTE', description: 'Clave 06 (texto)' },
          value: { type: 'string', nullable: true, example: 'Valor de la configuración', description: 'Valor de la configuración' },
          displayName: { type: 'string', nullable: true, example: 'Nombre para mostrar', description: 'Nombre para mostrar (máx 50 caracteres)' },
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
