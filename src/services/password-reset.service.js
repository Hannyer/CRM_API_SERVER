const crypto = require('crypto');
const usersRepo = require('../repository/user.repository');
const { encrypt } = require('../utils/crypto-compat');
const { AppError } = require('../utils/AppError');
const { sendMail, isMailConfigured, escapeHtml } = require('./mail.service');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_PASSWORD_RESET_MESSAGE =
  'Si el correo esta registrado, recibiras instrucciones para restablecer tu contrasena.';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getExpirationMinutes() {
  const parsed = Number.parseInt(process.env.PASSWORD_RESET_EXPIRATION_MINUTES || '30', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

function getUserName(user) {
  return user.full_name || user.fullName || user.email || 'usuario';
}

function buildResetUrl(token) {
  const explicitUrl = process.env.PASSWORD_RESET_URL;
  if (explicitUrl) {
    const separator = explicitUrl.includes('?') ? '&' : '?';
    return `${explicitUrl}${separator}token=${encodeURIComponent(token)}`;
  }

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  return `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

function buildPasswordResetEmail(user, resetUrl, expirationMinutes) {
  const name = getUserName(user);
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(resetUrl);

  return {
    subject: 'Restablece tu contrasena',
    text: [
      `Hola ${name},`,
      '',
      'Recibimos una solicitud para restablecer tu contrasena.',
      `Abre este enlace antes de ${expirationMinutes} minutos:`,
      resetUrl,
      '',
      'Si no solicitaste este cambio, puedes ignorar este correo.',
      '',
      'CoreLink Operations',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
        <h2 style="margin: 0 0 16px; color: #0f766e;">Restablece tu contrasena</h2>
        <p>Hola ${safeName},</p>
        <p>Recibimos una solicitud para restablecer tu contrasena.</p>
        <p>
          <a href="${safeUrl}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 12px 18px; border-radius: 10px; text-decoration: none; font-weight: 700;">
            Crear nueva contrasena
          </a>
        </p>
        <p>Este enlace vence en ${expirationMinutes} minutos.</p>
        <p style="color: #64748b; font-size: 13px;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
      </div>
    `,
  };
}

function buildPasswordSetupEmail(user, resetUrl, expirationMinutes) {
  const name = getUserName(user);
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(resetUrl);

  return {
    subject: 'Crea tu contrasena de acceso',
    text: [
      `Hola ${name},`,
      '',
      'Se creo tu usuario en CoreLink Operations.',
      `Abre este enlace antes de ${expirationMinutes} minutos para crear tu contrasena:`,
      resetUrl,
      '',
      'Si no esperabas este correo, contacta al administrador.',
      '',
      'CoreLink Operations',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
        <h2 style="margin: 0 0 16px; color: #0f766e;">Crea tu contrasena de acceso</h2>
        <p>Hola ${safeName},</p>
        <p>Se creo tu usuario en <strong>CoreLink Operations</strong>.</p>
        <p>
          <a href="${safeUrl}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 12px 18px; border-radius: 10px; text-decoration: none; font-weight: 700;">
            Crear contrasena
          </a>
        </p>
        <p>Este enlace vence en ${expirationMinutes} minutos.</p>
        <p style="color: #64748b; font-size: 13px;">Si no esperabas este correo, contacta al administrador.</p>
      </div>
    `,
  };
}

async function createPasswordTokenForUser(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const expirationMinutes = getExpirationMinutes();
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

  await usersRepo.setPasswordResetToken(user.id, hashToken(token), expiresAt);

  return {
    token,
    resetUrl: buildResetUrl(token),
    expirationMinutes,
  };
}

async function requestPasswordReset(email) {
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    throw new AppError('email es requerido y debe tener un formato valido', 400, 'INVALID_EMAIL');
  }

  if (!isMailConfigured()) {
    throw new AppError(
      'Servicio de correo no configurado. Configure GMAIL_USER y GMAIL_APP_PASSWORD.',
      503,
      'MAIL_NOT_CONFIGURED'
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await usersRepo.getUserByEmail(normalizedEmail);

  if (!user || !user.status) {
    return { message: GENERIC_PASSWORD_RESET_MESSAGE };
  }

  const { resetUrl, expirationMinutes } = await createPasswordTokenForUser(user);
  const emailContent = buildPasswordResetEmail(user, resetUrl, expirationMinutes);
  await sendMail({
    to: user.email,
    ...emailContent,
  });

  return { message: GENERIC_PASSWORD_RESET_MESSAGE };
}

async function sendPasswordSetupLink(user) {
  if (!user?.id || !user?.email) {
    throw new AppError('Usuario invalido para enviar enlace de contrasena', 400, 'INVALID_USER');
  }
  if (!isMailConfigured()) {
    throw new AppError(
      'Servicio de correo no configurado. Configure GMAIL_USER y GMAIL_APP_PASSWORD.',
      503,
      'MAIL_NOT_CONFIGURED'
    );
  }

  const { resetUrl, expirationMinutes } = await createPasswordTokenForUser(user);
  const emailContent = buildPasswordSetupEmail(user, resetUrl, expirationMinutes);
  await sendMail({
    to: user.email,
    ...emailContent,
  });
  return true;
}

async function resetPassword({ token, newPassword }) {
  if (typeof token !== 'string' || token.trim().length < 32) {
    throw new AppError('Token de recuperacion invalido', 400, 'INVALID_PASSWORD_RESET_TOKEN');
  }

  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    throw new AppError('La nueva contrasena debe tener al menos 6 caracteres', 400, 'INVALID_PASSWORD');
  }

  const user = await usersRepo.getUserByPasswordResetToken(hashToken(token.trim()));
  if (!user) {
    throw new AppError(
      'El enlace de recuperacion no es valido o ya expiro',
      400,
      'PASSWORD_RESET_TOKEN_EXPIRED'
    );
  }

  await usersRepo.updatePasswordById(user.id, encrypt(newPassword));
  return { message: 'Contrasena actualizada correctamente.' };
}

module.exports = {
  requestPasswordReset,
  sendPasswordSetupLink,
  resetPassword,
};
