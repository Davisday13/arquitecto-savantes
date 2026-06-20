// =========================================================
// Plantillas de correo para envío con PDFs adjuntos
// =========================================================
// Cada plantilla recibe un objeto con datos y devuelve HTML
// Se usa <<placeholders>> para personalizar (ej: <<cliente>>)
// =========================================================

const SAVANTE_BLUE = '#003153';

// Estilo base reutilizable
const baseStyles = `
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background: white; }
  .header { background: ${SAVANTE_BLUE}; color: white; padding: 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
  .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.85; letter-spacing: 1px; }
  .content { padding: 32px 24px; color: #333; line-height: 1.6; }
  .greeting { font-size: 16px; color: #111; margin-bottom: 16px; }
  .info-box { background: #f8f9fa; border-left: 4px solid ${SAVANTE_BLUE}; padding: 16px; margin: 20px 0; border-radius: 4px; }
  .info-box strong { color: ${SAVANTE_BLUE}; }
  .button { display: inline-block; background: ${SAVANTE_BLUE}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
  .footer { background: #f5f5f5; padding: 20px 24px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; }
  .footer strong { color: ${SAVANTE_BLUE}; }
  .small { font-size: 12px; color: #777; }
`;

// Wrapper común para todos los correos
function wrap(empresa, contenido) {
  const nombreEmpresa = empresa?.nombre_empresa || 'Savante Solutions';
  const telefono = empresa?.telefono || '';
  const correo = empresa?.correo || '';
  const direccion = empresa?.direccion || '';
  const piePagina = empresa?.pie_pagina_pdf || 'TU ALIADO COMERCIAL';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${nombreEmpresa}</h1>
      <p>${piePagina}</p>
    </div>
    <div class="content">
      ${contenido}
    </div>
    <div class="footer">
      <strong>${nombreEmpresa}</strong><br>
      ${direccion ? direccion + '<br>' : ''}
      ${telefono ? 'Tel: ' + telefono : ''} ${correo ? '· ' + correo : ''}
      <br><br>
      <span class="small">Este correo fue enviado automáticamente por Savantix. Por favor, no respondas a este mensaje si no es necesario.</span>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// =========================================================
// PLANTILLA 1: ORDEN DE TALLER
// =========================================================
export function plantillaOrden({ empresa, cliente, orden }) {
  const contenido = `
    <p class="greeting">Estimado/a <strong>${cliente.nombre}</strong>,</p>
    <p>Adjuntamos el documento de su orden de taller para su referencia.</p>

    <div class="info-box">
      <strong>Detalles de la orden</strong><br>
      <strong>Ticket:</strong> ${orden.numero_ticket}<br>
      ${orden.tipo_equipo ? '<strong>Equipo:</strong> ' + orden.tipo_equipo + ' ' + (orden.marca || '') + ' ' + (orden.modelo || '') + '<br>' : ''}
      ${orden.falla_reportada ? '<strong>Falla reportada:</strong> ' + orden.falla_reportada + '<br>' : ''}
      <strong>Estado actual:</strong> ${orden.estado || '—'}
    </div>

    <p>Si tiene alguna consulta sobre el estado de su equipo o necesita más información, no dude en contactarnos.</p>

    <p>Quedamos atentos.<br>
    <strong>Equipo de ${empresa?.nombre_empresa || 'Savante Solutions'}</strong></p>
  `;
  return wrap(empresa, contenido);
}

// =========================================================
// PLANTILLA 2: VISITA TÉCNICA
// =========================================================
export function plantillaVisita({ empresa, cliente, visita }) {
  const contenido = `
    <p class="greeting">Estimado/a <strong>${cliente.nombre}</strong>,</p>
    <p>Adjuntamos el reporte de la visita técnica realizada.</p>

    <div class="info-box">
      <strong>Detalles de la visita</strong><br>
      <strong>N° Visita:</strong> ${visita.numero_visita}<br>
      <strong>Fecha:</strong> ${visita.fecha_visita || '—'}<br>
      ${visita.tipo_visita ? '<strong>Tipo:</strong> ' + visita.tipo_visita + '<br>' : ''}
      ${visita.motivo ? '<strong>Motivo:</strong> ' + visita.motivo : ''}
    </div>

    <p>En el documento adjunto encontrará el detalle del trabajo realizado y las observaciones del técnico.</p>

    <p>Gracias por confiar en nosotros.<br>
    <strong>Equipo de ${empresa?.nombre_empresa || 'Savante Solutions'}</strong></p>
  `;
  return wrap(empresa, contenido);
}

// =========================================================
// PLANTILLA 3: RECIBO DE PAGO
// =========================================================
export function plantillaRecibo({ empresa, cliente, pago }) {
  const monto = Number(pago.monto || 0).toLocaleString('es-PA', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  });

  const contenido = `
    <p class="greeting">Estimado/a <strong>${cliente.nombre}</strong>,</p>
    <p>Hemos recibido su pago. Adjuntamos el recibo correspondiente.</p>

    <div class="info-box">
      <strong>Detalles del pago</strong><br>
      <strong>N° Recibo:</strong> ${pago.numero_recibo}<br>
      <strong>Monto:</strong> ${monto}<br>
      <strong>Método:</strong> ${pago.metodo_pago || '—'}<br>
      <strong>Fecha:</strong> ${pago.fecha_pago || '—'}<br>
      ${pago.documento_referencia ? '<strong>Aplicado a:</strong> ' + pago.documento_referencia : ''}
    </div>

    <p>Gracias por su pago. Si necesita una factura fiscal, por favor contáctenos.</p>

    <p>Atentamente,<br>
    <strong>Equipo de ${empresa?.nombre_empresa || 'Savante Solutions'}</strong></p>
  `;
  return wrap(empresa, contenido);
}

// =========================================================
// PLANTILLA 4: PRESUPUESTO
// =========================================================
export function plantillaPresupuesto({ empresa, cliente, presupuesto }) {
  const total = Number(presupuesto.total_general || 0).toLocaleString('es-PA', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  });

  const fechaValidez = presupuesto.fecha_validez
    ? new Date(presupuesto.fecha_validez).toLocaleDateString('es-PA')
    : '—';

  const contenido = `
    <p class="greeting">Estimado/a <strong>${cliente.nombre}</strong>,</p>
    <p>Le hacemos llegar el presupuesto solicitado para su revisión.</p>

    <div class="info-box">
      <strong>Detalles del presupuesto</strong><br>
      <strong>N° Presupuesto:</strong> ${presupuesto.numero_presupuesto}<br>
      ${presupuesto.asunto ? '<strong>Asunto:</strong> ' + presupuesto.asunto + '<br>' : ''}
      <strong>Total:</strong> ${total}<br>
      <strong>Válido hasta:</strong> ${fechaValidez}
    </div>

    <p>El detalle completo de ítems, condiciones y observaciones se encuentra en el documento adjunto.</p>

    <p>Si tiene alguna duda o desea aprobar el presupuesto, por favor contáctenos. Estamos a sus órdenes.</p>

    <p>Atentamente,<br>
    <strong>Equipo de ${empresa?.nombre_empresa || 'Savante Solutions'}</strong></p>
  `;
  return wrap(empresa, contenido);
}

// =========================================================
// PLANTILLA 5: VENTA DIRECTA (placeholder para v8.2)
// =========================================================
export function plantillaVentaDirecta({ empresa, cliente, venta }) {
  const total = Number(venta.total_general || 0).toLocaleString('es-PA', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  });

  const contenido = `
    <p class="greeting">Estimado/a <strong>${cliente.nombre}</strong>,</p>
    <p>Adjuntamos el comprobante de su compra.</p>

    <div class="info-box">
      <strong>N° Venta:</strong> ${venta.numero_venta}<br>
      <strong>Total:</strong> ${total}<br>
      <strong>Fecha:</strong> ${venta.fecha_venta || '—'}
    </div>

    <p>Gracias por su compra.<br>
    <strong>Equipo de ${empresa?.nombre_empresa || 'Savante Solutions'}</strong></p>
  `;
  return wrap(empresa, contenido);
}
