const nodemailer = require('nodemailer');

let transporter = null;
let transporterKey = null;
let streamTransporter = null;

function getMailConfig() {
  const user = process.env.MAIL_USER || process.env.GMAIL_USER;
  const pass = process.env.MAIL_PASS || process.env.GMAIL_APP_PASSWORD;
  const fromName = process.env.MAIL_FROM_NAME || 'CoreLink Operations';
  const from = process.env.MAIL_FROM || (user ? `${fromName} <${user}>` : undefined);

  const provider = process.env.MAIL_PROVIDER || 'smtp';
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  return { user, pass, from, provider, clientId, clientSecret, refreshToken };
}

function isMailConfigured() {
  const { user, pass, provider, clientId, clientSecret, refreshToken } = getMailConfig();
  if (provider === 'gmail-api') return Boolean(user && clientId && clientSecret && refreshToken);
  return provider === 'smtp' && Boolean(user && pass);
}

function getTransporter() {
  const { user, pass } = getMailConfig();

  if (!user || !pass) {
    const error = new Error('Servicio de correo no configurado');
    error.code = 'MAIL_NOT_CONFIGURED';
    throw error;
  }

  const key = `${user}:${pass}`;
  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      family: 4,
      auth: { user, pass },
      // Sin estos topes, si el puerto SMTP esta bloqueado la conexion se queda
      // colgada varios minutos en vez de fallar. Mejor fallar rapido y registrar.
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
    });
    transporterKey = key;
  }

  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const { from, provider } = getMailConfig();
  const started = Date.now();
  try {
    if (!isMailConfigured()) {
      const error = new Error('Servicio de correo no configurado. Revise MAIL_PROVIDER y las credenciales del proveedor.');
      error.code = 'MAIL_NOT_CONFIGURED';
      throw error;
    }
    const result = provider === 'gmail-api'
      ? await sendViaGmailApi({ from, to, subject, text, html })
      : await getTransporter().sendMail({ from, to, subject, text, html });
    console.info('[mail]', JSON.stringify({ event: 'accepted', provider, durationMs: Date.now() - started, messageId: result.messageId }));
    return result;
  } catch (error) {
    console.error('[mail]', JSON.stringify({
      event: 'failed', provider, durationMs: Date.now() - started,
      code: error.code || 'MAIL_UNKNOWN_ERROR', stage: error.stage || (provider === 'smtp' ? 'smtp' : 'configuration_or_mime'),
      httpStatus: error.httpStatus, reason: error.mailReason,
      hint: getMailHint(error), missingVariables: getMissingMailVariables(),
    }));
    throw error;
  }
}

function getMissingMailVariables() {
  const config = getMailConfig();
  const required = config.provider === 'gmail-api'
    ? { 'GMAIL_USER o MAIL_USER': config.user, GMAIL_CLIENT_ID: config.clientId, GMAIL_CLIENT_SECRET: config.clientSecret, GMAIL_REFRESH_TOKEN: config.refreshToken }
    : { 'GMAIL_USER o MAIL_USER': config.user, 'GMAIL_APP_PASSWORD o MAIL_PASS': config.pass };
  return Object.keys(required).filter((key) => !required[key]);
}

function getMailHint(error) {
  if (error.mailReason === 'invalid_grant') return 'Refresh token vencido o revocado, o no corresponde al cliente OAuth. Reautorice Gmail; en modo Testing caduca a los 7 dias.';
  if (['invalid_client', 'unauthorized_client'].includes(error.mailReason)) return 'Revise GMAIL_CLIENT_ID y GMAIL_CLIENT_SECRET y el cliente que genero el refresh token.';
  if (error.code === 'MAIL_NOT_CONFIGURED') return 'Revise MAIL_PROVIDER (smtp o gmail-api) y missingVariables.';
  if (error.httpStatus === 403) return 'Revise Gmail API habilitada, permiso gmail.send, restricciones y cuota en Google Cloud.';
  if (error.httpStatus === 429) return 'Google limito los envios. Revise cuotas; no reintente en bucle.';
  if (error.httpStatus === 401) return 'Google rechazo la autorizacion; vuelva a autorizar con gmail.send.';
  if (error.code === 'EAUTH') return 'SMTP rechazo las credenciales. Revise usuario y contrasena de aplicacion.';
  if (error.stage === 'network' || error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') return 'Fallo de red o timeout; SMTP 587 esta bloqueado en Render gratuito. Use MAIL_PROVIDER=gmail-api.';
  return 'Revise code, stage, httpStatus y reason; confirme las variables del proveedor en Render.';
}

async function googleRequest(url, options, code) {
  let response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  } catch {
    const error = new Error('No se pudo conectar con Google por HTTPS o se agoto el tiempo de espera.');
    error.code = code;
    error.stage = 'network';
    throw error;
  }
  let data;
  try {
    data = await response.json();
  } catch {
    const error = new Error('Google devolvio una respuesta no JSON.');
    error.code = code;
    error.stage = 'response';
    error.httpStatus = response.status;
    throw error;
  }
  if (!response.ok) {
    // No registrar respuestas completas: pueden contener datos del mensaje o credenciales.
    const candidate = typeof data.error === 'string' ? data.error : data.error?.status;
    const reason = /^[a-zA-Z0-9_]{1,80}$/.test(candidate || '') ? candidate : 'unknown';
    const error = new Error(`Google rechazo la solicitud de correo (HTTP ${response.status}, ${reason || 'unknown'}).`);
    error.code = code;
    error.stage = code === 'GMAIL_OAUTH_ERROR' ? 'oauth' : 'gmail_send';
    error.httpStatus = response.status;
    error.mailReason = reason;
    throw error;
  }
  return data;
}

async function sendViaGmailApi(message) {
  const { clientId, clientSecret, refreshToken } = getMailConfig();
  const token = await googleRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  }, 'GMAIL_OAUTH_ERROR');
  if (!token.access_token) {
    const error = new Error('Google no devolvio un access token.');
    error.code = 'GMAIL_OAUTH_ERROR';
    throw error;
  }
  // Nodemailer solo construye el MIME; este transporte no abre conexiones SMTP.
  streamTransporter ||= nodemailer.createTransport({ streamTransport: true, buffer: true });
  const compiled = await streamTransporter.sendMail({ ...message, disableFileAccess: true, disableUrlAccess: true });
  const result = await googleRequest('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: compiled.message.toString('base64url') }),
  }, 'GMAIL_SEND_ERROR');
  return { messageId: result.id, threadId: result.threadId };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

module.exports = {
  sendMail,
  isMailConfigured,
  escapeHtml,
  getMissingMailVariables,
};
