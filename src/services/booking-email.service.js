const { sendMail, isMailConfigured, escapeHtml } = require('./mail.service');

function asNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatMoney(value) {
  const parsed = asNumber(value);
  if (parsed === null) return 'Pendiente';

  const currency = process.env.MAIL_INVOICE_CURRENCY || 'USD';
  try {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(parsed);
  } catch {
    return `$${parsed.toFixed(2)}`;
  }
}

function formatDateTime(value) {
  if (!value) return 'Pendiente';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat('es-CR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function yesNo(value) {
  return value ? 'Si' : 'No';
}

function buildRows(rows) {
  return rows
    .map(([label, value]) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${escapeHtml(label)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${escapeHtml(value)}</td>
      </tr>
    `)
    .join('');
}

function buildBookingInvoiceEmail(booking) {
  const shortId = String(booking.id || '').slice(0, 8).toUpperCase();
  const customerName = booking.customerName || 'Cliente';
  const referencePoint = booking.referencePointDescription || 'No aplica';
  const activityTitle = booking.activityTitle || 'Actividad reservada';

  const rows = [
    ['Reserva', shortId || booking.id || 'Pendiente'],
    ['Cliente', customerName],
    ['Actividad', activityTitle],
    ['Fecha y hora', formatDateTime(booking.scheduledStart)],
    ['Personas', booking.numberOfPeople ?? 0],
    ['Adultos', booking.adultCount ?? 0],
    ['Ninos', booking.childCount ?? 0],
    ['Adultos mayores', booking.seniorCount ?? 0],
    ['Infantes', booking.infantCount ?? 0],
    ['Transporte', yesNo(booking.transport)],
    ['Punto de referencia', referencePoint],
    ['Tipo de pago', booking.paymentTypeName || 'Pendiente'],
    ['Subtotal', formatMoney(booking.subtotal)],
    ['IVA', formatMoney(booking.vatAmount)],
    ['Total', formatMoney(booking.total)],
  ];

  return {
    subject: `Factura de reserva ${shortId || ''}`.trim(),
    text: [
      `Hola ${customerName},`,
      '',
      'Gracias por tu reserva. Detalle:',
      `Reserva: ${shortId || booking.id || 'Pendiente'}`,
      `Actividad: ${activityTitle}`,
      `Fecha y hora: ${formatDateTime(booking.scheduledStart)}`,
      `Personas: ${booking.numberOfPeople ?? 0}`,
      `Transporte: ${yesNo(booking.transport)}`,
      `Subtotal: ${formatMoney(booking.subtotal)}`,
      `IVA: ${formatMoney(booking.vatAmount)}`,
      `Total: ${formatMoney(booking.total)}`,
      '',
      'CoreLink Operations',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5; max-width: 680px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0f766e, #115e59); color: #ffffff; padding: 22px; border-radius: 16px 16px 0 0;">
          <p style="margin: 0 0 6px; opacity: .82; text-transform: uppercase; letter-spacing: .08em; font-size: 12px;">CoreLink Operations</p>
          <h2 style="margin: 0;">Factura de reserva</h2>
        </div>
        <div style="border: 1px solid #dbe3ef; border-top: 0; padding: 22px; border-radius: 0 0 16px 16px;">
          <p>Hola <strong>${escapeHtml(customerName)}</strong>,</p>
          <p>Gracias por tu reserva. Estos son los detalles de tu factura:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 18px 0; background: #ffffff;">
            <tbody>
              ${buildRows(rows)}
            </tbody>
          </table>
          <div style="text-align: right; margin-top: 18px;">
            <span style="display: inline-block; background: #ecfdf5; color: #0f766e; padding: 12px 16px; border-radius: 12px; font-weight: 800; font-size: 18px;">
              Total: ${escapeHtml(formatMoney(booking.total))}
            </span>
          </div>
          <p style="color: #64748b; font-size: 13px; margin-top: 22px;">Si tienes dudas sobre tu reserva, responde a este correo.</p>
        </div>
      </div>
    `,
  };
}

async function sendBookingInvoiceEmail(booking) {
  if (!booking?.customerEmail) return false;
  if (!isMailConfigured()) {
    console.warn('Factura no enviada: servicio de correo no configurado.');
    return false;
  }

  const emailContent = buildBookingInvoiceEmail(booking);
  await sendMail({
    to: booking.customerEmail,
    ...emailContent,
  });
  return true;
}

module.exports = {
  sendBookingInvoiceEmail,
};
