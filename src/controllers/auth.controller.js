// src/controllers/auth.controller.js
const userService = require('../services/users.service');
const configService = require('../services/config.service');
const { decrypt, encrypt } = require('../utils/crypto-compat');

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: usuario@correo.com
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Sesión iniciada
 *       401:
 *         description: Credenciales incorrectas
 *       500:
 *         description: Error interno
 */
async function login(req, res) {
  try {
    const unauthorized = () =>
      res.status(401).json({ message: 'Credenciales incorrectas. Por favor, verifica tu usuario y contraseña.' });

    const { username = '', password = '' } = req.body || {};
    console.log(encrypt(password));
    const user = await userService.findByEmail(username);

    if (!user) return unauthorized();

    let storedPlain;
    try {

      storedPlain = decrypt(user.password_hash);
    } catch (e) {
      console.log("Error:  " + e.message);
      return unauthorized();
    }
    console.log(storedPlain)
    console.log(password)
    if (storedPlain !== password) return unauthorized();
    if (!user.status) return unauthorized();

    const rolClienteValue = await configService.getRolClienteValue();
    const isExternal =
      rolClienteValue != null && String(user.role_id) === String(rolClienteValue);

    const jwtSecret = process.env.JWT_SECRET || 'super-secret-default-key';
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user.id, roleId: user.role_id },
      jwtSecret,
      { expiresIn: '8h' }
    );

    const {
      password_hash: _passwordHash,
      ...safeUser
    } = user;
    return res.json({
      token,
      user: {
        id: safeUser.id,
        cedula: safeUser.cedula,
        email: safeUser.email,
        fullName: safeUser.full_name,
        phone: safeUser.phone,
        roleId: safeUser.role_id,
        roleName: safeUser.role_name,
        licenseExpirationDate: safeUser.license_expiration_date,
        speaksEnglish: safeUser.speaks_english,
        status: safeUser.status,
        isexternal: isExternal,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Error interno' });
  }
}

module.exports = { login };
