const crypto = require('node:crypto');
function sessionVersion(user, secret) {
  return crypto.createHmac('sha256', secret)
    .update(JSON.stringify([user.id, user.role_id, user.password_hash, user.status])).digest('hex');
}
module.exports = { sessionVersion };
