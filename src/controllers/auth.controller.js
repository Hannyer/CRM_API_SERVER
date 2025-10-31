// src/controllers/auth.controller.js
const userService = require('../services/users.service');
const configService = require('../services/config.service');
const { decrypt,encrypt } = require('../utils/crypto-compat');

async function login(req, res) {
  try {
     const unauthorized = () =>
      res.status(401).json({ message: 'Credenciales incorrectas. Por favor, verifica tu usuario y contraseña.' });

    const { username = '', password = '' } = req.body || {};
    const user = await userService.findByEmail(username);
 
    if (!user) return unauthorized();

    // Password en BD está cifrado como en C#
    let storedPlain;
    try {
      
      storedPlain = decrypt(user.Password);
    } catch(e) {
          console.log("Error:  "+e.message);
      return unauthorized();
    }
    console.log(storedPlain)
    console.log(password)
    if (storedPlain !== password) return unauthorized();
    if (!user.Status) return unauthorized();

    const rolClienteValue = await configService.getRolClienteValue();
    const isExternal = rolClienteValue != null && String(user.ID_Role) === String(rolClienteValue);

    const token = 'fake.jwt.token';
    return res.json({ token, user: { ...user, isexternal: isExternal } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Error interno' });
  }
}

module.exports = { login };
