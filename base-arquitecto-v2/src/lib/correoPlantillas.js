// Plantillas de correo para Cotización, Proyecto y Pago

function wrap(empresa, contenido) {
  const nom = empresa?.nombre_empresa || 'Mi Empresa';
  const tel = empresa?.telefono || '';
  const corr = empresa?.correo || '';
  const dir = empresa?.direccion || '';
  const pie = empresa?.pie_pagina_pdf || 'ARQUITECTURA & DISEÑO';

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><style>
    body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5}
    .container{max-width:600px;margin:0 auto;background:white}
    .header{background:#1e40af;color:white;padding:24px;text-align:center}
    .header h1{margin:0;font-size:24px;font-weight:600}
    .header p{margin:4px 0 0;font-size:13px;opacity:.85;letter-spacing:1px}
    .content{padding:32px 24px;color:#333;line-height:1.6}
    .greeting{font-size:16px;color:#111;margin-bottom:16px}
    .info-box{background:#f8f9fa;border-left:4px solid #1e40af;padding:16px;margin:20px 0;border-radius:4px}
    .info-box strong{color:#1e40af}
    .footer{background:#f5f5f5;padding:20px 24px;text-align:center;color:#666;font-size:12px;border-top:1px solid #eee}
    .footer strong{color:#1e40af}
  </style></head><body>
  <div class="container">
    <div class="header"><h1>${nom}</h1><p>${pie}</p></div>
    <div class="content">${contenido}</div>
    <div class="footer"><strong>${nom}</strong><br>${dir ? dir + '<br>' : ''}${tel ? 'Tel: ' + tel : ''} ${corr ? '· ' + corr : ''}</div>
  </div></body></html>`.trim();
}

export function plantillaCotizacion({ empresa, cliente, cotizacion }) {
  const total = (Number(cotizacion.monto_total || 0)).toLocaleString('es-PA', { style: 'currency', currency: 'PAB', minimumFractionDigits: 2 });
  return wrap(empresa, `<p class="greeting">Estimado/a <strong>${cliente.nombre}</strong>,</p>
    <p>Adjuntamos la cotización del proyecto para su revisión.</p>
    <div class="info-box"><strong>Detalles</strong><br>
    <strong>Proyecto:</strong> ${cotizacion.numero_proyecto} — ${cotizacion.nombre}<br>
    <strong>Total:</strong> ${total}<br>
    ${cotizacion.fecha_validez ? '<strong>Válido hasta:</strong> ' + cotizacion.fecha_validez : ''}</div>
    <p>Atentamente,<br><strong>Equipo de ${empresa?.nombre_empresa || 'la empresa'}</strong></p>`);
}

export function plantillaPago({ empresa, cliente, pago }) {
  const monto = (Number(pago.monto || 0)).toLocaleString('es-PA', { style: 'currency', currency: 'PAB', minimumFractionDigits: 2 });
  return wrap(empresa, `<p class="greeting">Estimado/a <strong>${cliente.nombre}</strong>,</p>
    <p>Hemos recibido su pago. Adjuntamos el recibo.</p>
    <div class="info-box"><strong>Detalles del pago</strong><br>
    <strong>Recibo:</strong> ${pago.numero_recibo || '—'}<br>
    <strong>Monto:</strong> ${monto}<br>
    <strong>Método:</strong> ${pago.metodo_pago || '—'}</div>
    <p>Gracias por su pago.</p></p>`);
}
