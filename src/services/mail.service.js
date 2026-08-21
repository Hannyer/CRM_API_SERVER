const nodemailer = require('nodemailer');

let transporter = null;
let transporterKey = null;

function getMailConfig() {
  const user = process.env.MAIL_USER || process.env.GMAIL_USER;
  const pass = process.env.MAIL_PASS || process.env.GMAIL_APP_PASSWORD;
  const fromName = process.env.MAIL_FROM_NAME || 'CoreLink Operations';
  const from = process.env.MAIL_FROM || (user ? `${fromName} <${user}>` : undefined);

  return { user, pass, from };
}

function isMailConfigured() {
  const { user, pass } = getMailConfig();
  return Boolean(user && pass);
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
    });
    transporterKey = key;
  }

  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const { from } = getMailConfig();
  return getTransporter().sendMail({ from, to, subject, text, html });
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
};
