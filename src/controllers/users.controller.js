const usersService = require('../services/users.service');
const { sendErrorResponse } = require('../utils/errorHandler');


/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Listar usuarios
 *     description: Obtiene una lista paginada de usuarios con opción de filtrar por estado y rol.
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Cantidad de registros por página
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo (true) o inactivo (false)
 *       - in: query
 *         name: roleId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por ID de rol específico (UUID)
 *     responses:
 *       200:
 *         description: Lista paginada de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Petición inválida (formatos incorrectos)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function list(req, res) {
  try {
    const { page, limit, status, roleId } = req.query;
    
    // Convertir status de string a boolean si viene provisto
    const statusBool = status !== undefined ? status === 'true' : undefined;

    const data = await usersService.listUsers({ 
      page, 
      limit, 
      status: statusBool, 
      roleId 
    });

    res.json({
      items: data.items,
      pagination: {
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages,
      },
    });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al listar usuarios');
  }
}

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Obtener usuario por ID
 *     description: Obtiene la información detallada de un usuario por su identificador único (UUID).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único del usuario
 *     responses:
 *       200:
 *         description: Información del usuario encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: ID de usuario inválido (formato UUID incorrecto)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function getById(req, res) {
  try {
    const user = await usersService.getUserById(req.params.id);
    if (!user) {
      return sendErrorResponse(res, { status: 404, message: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al obtener usuario');
  }
}

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Crear usuario
 *     description: Registra un nuevo usuario. Si roleId es Guía, languageIds (ops.language) es obligatorio y se guarda en ops.guide_language.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreateRequest'
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Datos requeridos faltantes o con formato inválido, o falta licencia para rol que lo exige
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Conflicto - Ya existe un usuario con la misma cédula o correo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function create(req, res) {
  try {
    const user = await usersService.createUser(req.body);
    res.status(201).json(user);
  } catch (e) {
    console.error(e);
    if (String(e.message).toLowerCase().includes('unique') || e?.code === '23505') {
      return sendErrorResponse(res, {
        status: 409,
        message: 'Ya existe un usuario con esa cédula o correo',
      });
    }
    sendErrorResponse(res, e, 500, 'Error al crear usuario');
  }
}

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Actualizar usuario
 *     description: Actualiza un usuario. Rol Guía requiere languageIds al cambiar de rol o si no tiene idiomas asignados.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único del usuario a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateRequest'
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Datos con formato inválido, o falta licencia para rol que lo exige
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Conflicto - Cédula o correo ya en uso por otro usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function update(req, res) {
  try {
    const user = await usersService.updateUser(req.params.id, req.body || {});
    if (!user) {
      return sendErrorResponse(res, { status: 404, message: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (e) {
    console.error(e);
    if (String(e.message).toLowerCase().includes('unique') || e?.code === '23505') {
      return sendErrorResponse(res, {
        status: 409,
        message: 'Ya existe un usuario con esa cédula o correo',
      });
    }
    sendErrorResponse(res, e, 500, 'Error al actualizar usuario');
  }
}

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Eliminar usuario (soft delete)
 *     description: Inactiva un usuario en el sistema (establece su estado a false de forma lógica).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único del usuario a eliminar
 *     responses:
 *       200:
 *         description: Usuario eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Usuario eliminado correctamente
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: ID de usuario inválido (formato UUID incorrecto)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function remove(req, res) {
  try {
    const user = await usersService.deleteUser(req.params.id);
    if (!user) {
      return sendErrorResponse(res, { status: 404, message: 'Usuario no encontrado' });
    }
    res.json({ message: 'Usuario eliminado correctamente', user });
  } catch (e) {
    console.error(e);
    sendErrorResponse(res, e, 500, 'Error al eliminar usuario');
  }
}

module.exports = { list, getById, create, update, remove };
