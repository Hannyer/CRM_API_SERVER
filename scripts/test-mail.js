require('dotenv').config();
const { sendMail, isMailConfigured } = require('../src/services/mail.service');

async function main() {
  const to = process.argv[2];
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new Error('Uso: node scripts/test-mail.js destinatario@example.com');
  }
  if (!isMailConfigured()) throw new Error('Correo no configurado. Revise docs/GMAIL_HTTPS.md');
  const result = await sendMail({
    to,
    subject: 'Prueba de correo CRM',
    text: 'Prueba del servicio de correo de CRM.',
    html: '<p>Prueba del servicio de correo de CRM.</p>',
  });
  console.log('Correo aceptado por el proveedor. messageId:', result.messageId);
}

main().catch((error) => {
  console.error(error.code || 'MAIL_TEST_ERROR', error.message);
  process.exitCode = 1;
});
