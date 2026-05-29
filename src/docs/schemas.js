
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
          status: { type: 'boolean', example: true },
          created_at: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' },
          updated_at: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' },
        },
      },

      LanguageListItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
          code: { type: 'string', example: 'es' },
          name: { type: 'string', example: 'Español' },
          status: { type: 'boolean', example: true },
          created_at: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' },
          updated_at: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' },
        },
      },

      LanguageCreateRequest: {
        type: 'object',
        required: ['code', 'name'],
        properties: {
          code: { type: 'string', example: 'es' },
          name: { type: 'string', example: 'Español' },
          status: { type: 'boolean', example: true },
        },
      },

      LanguageUpdateRequest: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'es' },
          name: { type: 'string', example: 'Español' },
          status: { type: 'boolean', example: true },
        },
      },

      ActivityType: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
          name: { type: 'string', example: 'Canopy', description: 'Nombre del tipo de actividad (único)' },
          description: { type: 'string', nullable: true, example: 'Tour de canopy por las copas de los árboles' },
          status: { type: 'boolean', example: true, description: 'Estado del registro' },
          createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' },
          updatedAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' },
        },
      },

      ActivityTypeListItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
          name: { type: 'string', example: 'Canopy' },
          description: { type: 'string', nullable: true, example: 'Tour de canopy' },
          status: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' },
          updatedAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' },
        },
      },

      ActivityTypeCreateRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Canopy', description: 'Nombre del tipo (obligatorio, único)' },
          description: { type: 'string', nullable: true, example: 'Tour de canopy por las copas de los árboles' },
          status: { type: 'boolean', example: true, description: 'Estado (por defecto true)' },
        },
      },

      ActivityTypeUpdateRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Canopy Premium' },
          description: { type: 'string', nullable: true, example: 'Descripción actualizada' },
          status: { type: 'boolean', example: false },
        },
      },

      Role: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Operador' },
          description: { type: 'string', nullable: true, example: 'Operaciones del día a día' },
          requiresLicense: { type: 'boolean', example: false },
          requiresLanguages: { type: 'boolean', example: false },
          status: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      RoleListItem: {
        $ref: '#/components/schemas/Role',
      },

      RoleSelectItem: {
        type: 'object',
        properties: {
          value: { type: 'string', format: 'uuid', description: 'ID del rol (roleId)' },
          label: { type: 'string', example: 'Conductor' },
          description: { type: 'string', nullable: true },
          requiresLicense: { type: 'boolean', example: true },
          requiresLanguages: { type: 'boolean', example: true },
        },
      },

      RoleCreateRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Supervisor' },
          description: { type: 'string', nullable: true },
          requiresLicense: { type: 'boolean', example: false },
          requiresLanguages: { type: 'boolean', example: false },
          status: { type: 'boolean', example: true },
        },
      },

      RoleUpdateRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Supervisor de turno' },
          description: { type: 'string', nullable: true },
          requiresLicense: { type: 'boolean' },
          requiresLanguages: { type: 'boolean' },
          status: { type: 'boolean' },
        },
      },

      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 50 },
          total: { type: 'integer', example: 5 },
          totalPages: { type: 'integer', example: 1 },
        },
      },

      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          cedula: { type: 'string', example: '1-2345-6789' },
          email: { type: 'string', format: 'email', example: 'usuario@correo.com' },
          fullName: { type: 'string', example: 'Juan Pérez' },
          phone: { type: 'string', example: '+506 8888-8888' },
          roleId: { type: 'string', format: 'uuid', description: 'FK a ops.role.id' },
          roleName: { type: 'string', example: 'Operador' },
          roleRequiresLicense: { type: 'boolean', example: false },
          roleRequiresLanguages: { type: 'boolean', example: false },
          licenseExpirationDate: { type: 'string', format: 'date', nullable: true, example: '2026-12-31' },
          speaksEnglish: { type: 'boolean', example: false },
          status: { type: 'boolean', example: true },
          languages: {
            type: 'array',
            description: 'Idiomas del guía (ops.guide_language + ops.language). Vacío si no es Guía',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                code: { type: 'string', example: 'es' },
                name: { type: 'string', example: 'Español' },
              },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      UserCreateRequest: {
        type: 'object',
        required: ['cedula', 'email', 'fullName', 'phone', 'password', 'roleId'],
        properties: {
          cedula: { type: 'string', example: '1-2345-6789' },
          email: { type: 'string', format: 'email', example: 'usuario@correo.com' },
          fullName: { type: 'string', example: 'Juan Pérez' },
          phone: { type: 'string', example: '+506 8888-8888' },
          password: { type: 'string', example: '123456' },
          roleId: { type: 'string', format: 'uuid', description: 'ID del rol. Ver GET /api/roles/select' },
          licenseExpirationDate: {
            type: 'string',
            format: 'date',
            example: '2026-12-31',
            description: 'Obligatorio si el rol tiene requiresLicense = true',
          },
          speaksEnglish: { type: 'boolean', example: false },
          status: { type: 'boolean', example: true },
          languageIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            description: 'Obligatorio si roleId es rol Guía (requiresLanguages). IDs de ops.language',
            example: ['123e4567-e89b-12d3-a456-426614174000'],
          },
        },
      },

      UserUpdateRequest: {
        type: 'object',
        properties: {
          cedula: { type: 'string' },
          email: { type: 'string', format: 'email' },
          fullName: { type: 'string' },
          phone: { type: 'string' },
          password: { type: 'string', description: 'Nueva contraseña (opcional)' },
          roleId: { type: 'string', format: 'uuid' },
          licenseExpirationDate: { type: 'string', format: 'date', nullable: true },
          speaksEnglish: { type: 'boolean' },
          status: { type: 'boolean' },
          languageIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            description: 'Actualiza idiomas en ops.guide_language. Obligatorio al cambiar a rol Guía',
          },
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
        },
      },

      GuideCreateRequest: {
        type: 'object',
        required: ['fullName', 'email'],
        properties: {
          fullName: { type: 'string', example: 'Juan Pérez' },
          email: { type: 'string', format: 'email', example: 'juan.perez@example.com' },
          phone: { type: 'string', nullable: true, example: '+506 8888-8888' },
          status: { type: 'boolean', example: true },
          languageIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            description: 'IDs de idiomas que habla el guía (opcional)',
            example: ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001'],
          },
        },
      },

      GuideUpdateRequest: {
        type: 'object',
        properties: {
          fullName: { type: 'string', example: 'Juan Pérez' },
          email: { type: 'string', format: 'email', example: 'juan.perez@example.com' },
          phone: { type: 'string', nullable: true, example: '+506 8888-8888' },
          status: { type: 'boolean', example: true },
          languageIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            description: 'IDs de idiomas que habla el guía (opcional). Si se proporciona, reemplaza todos los idiomas existentes.',
            example: ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001'],
          },
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
          licensePlate: { type: 'string', maxLength: 20, example: 'ABC-123', description: 'Placa del vehículo (única en el sistema, sin distinguir mayúsculas/minúsculas)' },
          circulationPermitExpirationDate: { type: 'string', format: 'date', example: '2026-12-31', description: 'Fecha de vencimiento del permiso de circulación (YYYY-MM-DD)' },
          ctpExpirationDate: { type: 'string', format: 'date', example: '2026-06-30', description: 'Fecha de vencimiento del CTP (YYYY-MM-DD)' },
        },
        required: ['id', 'capacity', 'model', 'operationalStatus', 'status', 'licensePlate', 'circulationPermitExpirationDate', 'ctpExpirationDate'],
      },

      TransportListItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
          capacity: { type: 'integer', example: 20, description: 'Capacidad de pasajeros' },
          model: { type: 'string', example: 'Toyota Hiace 2023' },
          operationalStatus: { type: 'boolean', example: true, description: 'true = activo, false = fuera de circulación' },
          status: { type: 'boolean', example: true, description: 'Estado general del registro' },
          licensePlate: { type: 'string', maxLength: 20, example: 'ABC-123', description: 'Placa del vehículo (única en el sistema, sin distinguir mayúsculas/minúsculas)' },
          circulationPermitExpirationDate: { type: 'string', format: 'date', example: '2026-12-31', description: 'Fecha de vencimiento del permiso de circulación (YYYY-MM-DD)' },
          ctpExpirationDate: { type: 'string', format: 'date', example: '2026-06-30', description: 'Fecha de vencimiento del CTP (YYYY-MM-DD)' },
        },
        required: ['id', 'capacity', 'model', 'operationalStatus', 'status', 'licensePlate', 'circulationPermitExpirationDate', 'ctpExpirationDate'],
      },

      TransportCreateRequest: {
        type: 'object',
        required: ['capacity', 'model', 'licensePlate', 'circulationPermitExpirationDate', 'ctpExpirationDate'],
        properties: {
          capacity: { type: 'integer', example: 20, description: 'Capacidad de pasajeros (debe ser mayor a 0)' },
          model: { type: 'string', example: 'Toyota Hiace 2023' },
          operationalStatus: { type: 'boolean', example: true, description: 'Estado operativo (por defecto true)' },
          status: { type: 'boolean', example: true, description: 'Estado general (por defecto true)' },
          licensePlate: { type: 'string', maxLength: 20, example: 'ABC-123', description: 'Placa del vehículo (máx. 20 caracteres, única)' },
          circulationPermitExpirationDate: { type: 'string', format: 'date', example: '2026-12-31', description: 'Vencimiento del permiso de circulación (YYYY-MM-DD)' },
          ctpExpirationDate: { type: 'string', format: 'date', example: '2026-06-30', description: 'Vencimiento del CTP (YYYY-MM-DD)' },
        },
      },

      TransportUpdateRequest: {
        type: 'object',
        required: ['licensePlate', 'circulationPermitExpirationDate', 'ctpExpirationDate'],
        properties: {
          capacity: { type: 'integer', example: 25, description: 'Capacidad de pasajeros (debe ser mayor a 0)' },
          model: { type: 'string', example: 'Toyota Hiace 2024' },
          operationalStatus: { type: 'boolean', example: false, description: 'Estado operativo' },
          status: { type: 'boolean', example: true, description: 'Estado general' },
          licensePlate: { type: 'string', maxLength: 20, example: 'XYZ-789', description: 'Placa del vehículo (máx. 20 caracteres, única)' },
          circulationPermitExpirationDate: { type: 'string', format: 'date', example: '2027-01-15', description: 'Vencimiento del permiso de circulación (YYYY-MM-DD)' },
          ctpExpirationDate: { type: 'string', format: 'date', example: '2027-01-15', description: 'Vencimiento del CTP (YYYY-MM-DD)' },
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

      ActivityByDate: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID de la actividad' },
          title: { type: 'string', example: 'Tour Canopy - Grupo 1', description: 'Título de la actividad' },
          partySize: { type: 'integer', example: 20, description: 'Tamaño del grupo' },
          adultPrice: { type: 'number', format: 'decimal', example: 50.00, description: 'Precio para adultos' },
          childPrice: { type: 'number', format: 'decimal', example: 25.00, description: 'Precio para niños' },
          seniorPrice: { type: 'number', format: 'decimal', example: 40.00, description: 'Precio para adultos mayores' },
          scheduledStart: { type: 'string', format: 'date-time', example: '2024-12-25T08:00:00Z', description: 'Fecha y hora de inicio programada' },
          scheduledEnd: { type: 'string', format: 'date-time', example: '2024-12-25T10:00:00Z', description: 'Fecha y hora de fin programada' },
          activityTypeId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del tipo de actividad' },
          activityTypeName: { type: 'string', example: 'Canopy', description: 'Nombre del tipo de actividad' },
          activityTypeDescription: { type: 'string', nullable: true, example: 'Tour de canopy por las copas de los árboles', description: 'Descripción del tipo de actividad' },
          guides: {
            type: 'array',
            description: 'Lista de guías asignados a la actividad',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
                name: { type: 'string', example: 'Juan Pérez' },
                email: { type: 'string', example: 'juan.perez@example.com' },
                isLeader: { type: 'boolean', example: true, description: 'Indica si es guía líder' },
              },
            },
          },
          languages: {
            type: 'array',
            description: 'Idiomas disponibles para la actividad',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
                code: { type: 'string', example: 'es' },
                name: { type: 'string', example: 'Español' },
              },
            },
          },
        },
      },

      ActivityListItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID de la actividad' },
          title: { type: 'string', example: 'Tour Canopy - Grupo 1', description: 'Título de la actividad' },
          partySize: { type: 'integer', example: 20, description: 'Tamaño del grupo' },
          adultPrice: { type: 'number', format: 'decimal', example: 50.00, description: 'Precio para adultos' },
          childPrice: { type: 'number', format: 'decimal', example: 25.00, description: 'Precio para niños' },
          seniorPrice: { type: 'number', format: 'decimal', example: 40.00, description: 'Precio para adultos mayores' },
          scheduledStart: { type: 'string', format: 'date-time', example: '2024-12-25T08:00:00Z', description: 'Fecha y hora de inicio programada' },
          scheduledEnd: { type: 'string', format: 'date-time', example: '2024-12-25T10:00:00Z', description: 'Fecha y hora de fin programada' },
          activityTypeId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del tipo de actividad' },
          activityTypeName: { type: 'string', example: 'Canopy', description: 'Nombre del tipo de actividad' },
        },
      },

      Activity: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID de la actividad' },
          title: { type: 'string', example: 'Tour Canopy - Grupo 1', description: 'Título de la actividad' },
          partySize: { type: 'integer', example: 20, description: 'Tamaño del grupo' },
          adultPrice: { type: 'number', format: 'decimal', example: 50.00, description: 'Precio para adultos' },
          childPrice: { type: 'number', format: 'decimal', example: 25.00, description: 'Precio para niños' },
          seniorPrice: { type: 'number', format: 'decimal', example: 40.00, description: 'Precio para adultos mayores' },
          status: { type: 'boolean', example: true, description: 'Estado de la actividad' },
          activityTypeId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del tipo de actividad' },
          activityTypeName: { type: 'string', example: 'Canopy', description: 'Nombre del tipo de actividad' },
          activityTypeDescription: { type: 'string', nullable: true, example: 'Tour de canopy por las copas de los árboles', description: 'Descripción del tipo de actividad' },
        },
      },

      ActivityCreateRequest: {
        type: 'object',
        required: ['activityTypeId', 'title', 'partySize'],
        properties: {
          activityTypeId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del tipo de actividad' },
          title: { type: 'string', example: 'Tour Canopy - Grupo 1', description: 'Título de la actividad' },
          partySize: { type: 'integer', example: 20, description: 'Tamaño del grupo' },
          adultPrice: { type: 'number', format: 'decimal', example: 50.00, description: 'Precio para adultos' },
          childPrice: { type: 'number', format: 'decimal', example: 25.00, description: 'Precio para niños' },
          seniorPrice: { type: 'number', format: 'decimal', example: 40.00, description: 'Precio para adultos mayores' },
          status: { type: 'boolean', example: true, default: true, description: 'Estado de la actividad' },
          languageIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            example: ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001'],
            description: 'IDs de idiomas para la actividad',
          },
        },
      },

      ActivityUpdateRequest: {
        type: 'object',
        properties: {
          activityTypeId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del tipo de actividad' },
          title: { type: 'string', example: 'Tour Canopy - Grupo 1', description: 'Título de la actividad' },
          partySize: { type: 'integer', example: 20, description: 'Tamaño del grupo' },
          adultPrice: { type: 'number', format: 'decimal', example: 50.00, description: 'Precio para adultos' },
          childPrice: { type: 'number', format: 'decimal', example: 25.00, description: 'Precio para niños' },
          seniorPrice: { type: 'number', format: 'decimal', example: 40.00, description: 'Precio para adultos mayores' },
          start: { type: 'string', format: 'date-time', example: '2024-12-25T08:00:00Z', description: 'Fecha y hora de inicio programada' },
          end: { type: 'string', format: 'date-time', example: '2024-12-25T10:00:00Z', description: 'Fecha y hora de fin programada' },
          languageIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            example: ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001'],
            description: 'IDs de idiomas para la actividad',
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
