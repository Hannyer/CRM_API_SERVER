const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../src/services/mail.service'), 'utf8');

function load(env, responses = []) {
  const calls = [];
  const transports = [];
  const context = {
    module: { exports: {} }, process: { env }, URLSearchParams, AbortSignal,
    fetch: async (url, options) => {
      calls.push({ url, options });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return { ok: response.status === 200, status: response.status, json: async () => response.data };
    },
    require: () => ({ createTransport: (options) => {
      transports.push(options);
      return { sendMail: async () => options.streamTransport
        ? { message: Buffer.from('Subject: prueba\r\n\r\nContenido') }
        : { messageId: 'smtp-id' } };
    } }),
  };
  vm.runInNewContext(source, context);
  return { mail: context.module.exports, calls, transports };
}
const env = { MAIL_PROVIDER: 'gmail-api', GMAIL_USER: 'sender@gmail.com',
  GMAIL_CLIENT_ID: 'client', GMAIL_CLIENT_SECRET: 'secret', GMAIL_REFRESH_TOKEN: 'refresh' };
const message = { to: 'recipient@example.com', subject: 'prueba', text: 'Contenido' };

test('Gmail usa OAuth y HTTPS con MIME base64url, sin transporte SMTP', async () => {
  const { mail, calls, transports } = load(env, [
    { status: 200, data: { access_token: 'access' } },
    { status: 200, data: { id: 'gmail-id', threadId: 'thread' } },
  ]);
  assert.equal(mail.isMailConfigured(), true);
  assert.equal((await mail.sendMail(message)).messageId, 'gmail-id');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.body.get('grant_type'), 'refresh_token');
  assert.equal(calls[0].options.body.get('refresh_token'), 'refresh');
  assert.equal(calls[1].url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer access');
  assert.match(JSON.parse(calls[1].options.body).raw, /^[A-Za-z0-9_-]+$/);
  assert.equal(transports.length, 1);
  assert.equal(transports[0].streamTransport, true);
});
test('token revocado impide el envio sin exponer secretos', async () => {
  const { mail, calls } = load(env, [{ status: 400, data: { error: 'invalid_grant', error_description: 'secret' } }]);
  await assert.rejects(mail.sendMail(message), e => e.code === 'GMAIL_OAUTH_ERROR' && !e.message.includes('secret'));
  assert.equal(calls.length, 1);
});
test('error de envio no genera reintentos ni falso exito', async () => {
  const { mail, calls } = load(env, [
    { status: 200, data: { access_token: 'access' } },
    { status: 403, data: { error: { status: 'PERMISSION_DENIED' } } },
  ]);
  await assert.rejects(mail.sendMail(message), { code: 'GMAIL_SEND_ERROR' });
  assert.equal(calls.length, 2);
});
test('configuracion incompleta falla antes de hacer peticiones', async () => {
  const { mail, calls } = load({ ...env, GMAIL_REFRESH_TOKEN: '' });
  assert.equal(mail.isMailConfigured(), false);
  await assert.rejects(mail.sendMail(message), { code: 'MAIL_NOT_CONFIGURED' });
  assert.equal(calls.length, 0);
});
test('SMTP local sigue funcionando por defecto', async () => {
  const { mail, calls, transports } = load({ GMAIL_USER: 'sender@gmail.com', GMAIL_APP_PASSWORD: 'pass' });
  assert.equal((await mail.sendMail(message)).messageId, 'smtp-id');
  assert.equal(transports[0].host, 'smtp.gmail.com');
  assert.equal(calls.length, 0);
});
test('fallo de red devuelve un error controlado', async () => {
  const { mail } = load(env, [new Error('network secret')]);
  await assert.rejects(mail.sendMail(message), { code: 'GMAIL_OAUTH_ERROR' });
});
