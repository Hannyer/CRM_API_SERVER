# Gmail por HTTPS en Render

Requiere Node.js 18 o superior. MAIL_PROVIDER=smtp conserva el comportamiento local.
Con MAIL_PROVIDER=gmail-api se usa HTTPS para OAuth y Gmail; no se conecta a SMTP.
Las facturas, invitaciones y recuperaciones de contrasena usan el mismo servicio.

## 1. Autorizar la cuenta remitente

1. En https://console.cloud.google.com/ crea o selecciona un proyecto.
2. En APIs y servicios > Biblioteca, habilita Gmail API.
3. Configura Google Auth Platform (pantalla de consentimiento): nombre, correo de soporte y audiencia externa para una cuenta Gmail personal. Durante las pruebas agrega tu Gmail como usuario de prueba.
4. Agrega el permiso https://www.googleapis.com/auth/gmail.send. No se necesita acceso de lectura al buzon.
5. Crea un cliente OAuth de tipo Aplicacion web. Agrega exactamente este URI de redireccion autorizado: https://developers.google.com/oauthplayground
6. Abre https://developers.google.com/oauthplayground y en el engranaje activa Use your own OAuth credentials. Introduce el Client ID y Client secret del cliente anterior; elige acceso Offline si aparece esa opcion.
7. En Step 1 introduce https://www.googleapis.com/auth/gmail.send y pulsa Authorize APIs. Inicia sesion con la cuenta Gmail que enviara los correos y acepta el permiso.
8. En Step 2 pulsa Exchange authorization code for tokens. Guarda el refresh token de forma privada en las variables del backend. No uses el access token como refresh token.

Importante: con audiencia externa y estado Testing, Google normalmente caduca el refresh token a los 7 dias para este permiso. Antes de uso continuo, cambia el estado a In production y vuelve a autorizar para generar el token definitivo. Publicar la pantalla de consentimiento no equivale a obtener la verificacion de Google; sigue los requisitos que muestre la consola segun el uso de tu aplicacion. Los tokens tambien pueden revocarse y requerir nueva autorizacion.

## 2. Variables en Render > servicio backend > Environment

MAIL_PROVIDER=gmail-api
GMAIL_USER=tu-cuenta@gmail.com
MAIL_FROM_NAME=CoreLink Operations
GMAIL_CLIENT_ID=el-client-id
GMAIL_CLIENT_SECRET=el-client-secret
GMAIL_REFRESH_TOKEN=el-refresh-token

Si existe MAIL_USER, debe ser la misma cuenta que GMAIL_USER, porque MAIL_USER tiene prioridad.
Si existe MAIL_FROM, usa esa misma cuenta autorizada o elimina la variable para generar el remitente automaticamente. No uses una direccion ajena como remitente.
GMAIL_APP_PASSWORD y MAIL_PASS no se utilizan en modo gmail-api.
No copies credenciales a Vercel, al frontend, a Git o al chat.
Guarda y redespliega el servicio.

## 3. Validacion

Para una prueba local, instala las dependencias habituales del proyecto, copia las variables a .env y ejecuta:

    node scripts/test-mail.js destinatario@example.com

Este comando envia un correo real al destinatario indicado, sin crear reservas ni modificar la base de datos.
Una respuesta aceptada incluye messageId; revisa la bandeja de entrada y spam. La aceptacion por la API no garantiza entrega en inbox.
Despues del despliegue prueba un flujo real de la aplicacion y revisa los logs de Render y la carpeta Enviados de Gmail.

Errores:
- MAIL_NOT_CONFIGURED: faltan variables o MAIL_PROVIDER es invalido.
- GMAIL_OAUTH_ERROR / invalid_grant: token vencido, revocado o asociado a otro cliente; vuelve a autorizar.
- GMAIL_SEND_ERROR / HTTP 403: comprueba Gmail API habilitada y permiso gmail.send; consulta Google Cloud para restricciones de cuenta o cuota.
- Error de conexion HTTPS: comprueba conectividad y logs; no se reintenta automaticamente para evitar duplicados.

Las facturas siguen enviandose en segundo plano: crear la reserva correctamente no demuestra que el correo se entrego. Esta adaptacion no agrega una cola persistente ni reintentos de entrega.

Referencias:
https://developers.google.com/workspace/gmail/api/guides/sending
https://developers.google.com/identity/protocols/oauth2/web-server
https://developers.google.com/identity/protocols/oauth2#expiration
