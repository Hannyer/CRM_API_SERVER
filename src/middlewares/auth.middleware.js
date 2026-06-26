const jwt = require('jsonwebtoken');
const securityService = require('../services/security.service');
const { sendErrorResponse } = require('../utils/errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-default-key';

/**
 * Middleware para verificar que la petición contenga un JWT válido.
 * Si es válido, inyecta `req.user` con el payload decodificado.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No se proporcionó token de autenticación' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, roleId, ... }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

/**
 * Middleware de fábrica para verificar permisos sobre un módulo (menú).
 * @param {string} menuCode - Código del menú (ej: 'activities', 'bookings')
 */
function requirePermission(menuCode) {
  return async (req, res, next) => {
    try {
      const roleId = req.user?.roleId;
      if (!roleId) {
        return res.status(403).json({ message: 'No se identificó el rol del usuario' });
      }

      // Obtener los permisos del rol en la base de datos
      const permissionsMatrix = await securityService.getPermissionsByRoleId(roleId);
      
      // Buscar los permisos específicos para el módulo
      // Recordar que getPermissionsByRoleId devuelve la matriz con los nombres y códigos
      // Los items generados por la DB tienen menuCode u otro formato. Revisemos securityRepo.
      
      // NOTA: Si securityRepo.getPermissionsMatrixByRoleId devuelve los menu_id, menu_code, etc.
      const permissionItem = permissionsMatrix.items.find(item => item.code === menuCode);

      if (!permissionItem) {
        return res.status(403).json({ message: `No tienes permisos configurados para el módulo '${menuCode}'` });
      }

      const method = req.method.toUpperCase();

      if (method === 'GET' && !permissionItem.canRead) {
        return res.status(403).json({ message: 'No tienes permiso de lectura para este módulo' });
      }

      if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && !permissionItem.canWrite) {
        return res.status(403).json({ message: 'No tienes permiso de escritura para este módulo' });
      }

      if (method === 'DELETE' && !permissionItem.canDelete) {
        return res.status(403).json({ message: 'No tienes permiso de eliminación para este módulo' });
      }

      // Si pasa la validación, continuar
      next();
    } catch (error) {
      console.error('Error al validar permisos:', error);
      sendErrorResponse(res, error, 500, 'Error interno al validar permisos');
    }
  };
}

module.exports = {
  verifyToken,
  requirePermission
};
