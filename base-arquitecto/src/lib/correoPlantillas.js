function wrap(empresa, contenido) {
  const nombreEmpresa = empresa?.nombre_empresa || 'Mi Empresa';
  const telefono = empresa?.telefono || '';
  const correo = empresa?.correo || '';
  const direccion = empresa?.direccion || '';
  const piePagina = empresa?.pie_pagina_pdf || 'ARQUITECTURA & DISEÑO';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #1e40af; color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.85; letter-spacing: 1px; }
    .content { padding: 32px 24px; color: #333; line-height: 1.6; }
    .greeting { font-size: 16px; color: #111; margin-bottom: 16px; }
    .info-box { background: #f8f9fa; border-left: 4px solid #1e40af; padding: 16px; margin: 20px 0; border-radius: 4px; }
    .info-box strong { color: #1e40af; }
    .footer { background: #f5f5f5; padding: 20px 24px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; }
    .footer strong { color: #1e40af; }
    .small { font-size: 12px; color: #777; }
  </style>
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
      <span class="small">Este correo fue enviado automáticamente por el sistema.</span>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function plantillaCotizacion({ empresa, cliente, cotizacion }) {
  const total = Number(cotizacion.total_general || 0).toLocaleString('es-PA', {
    style: 'currency', currency: 'PAB', minimumFractionDigits: 2,
  });

  const contenido = `
    <p class="greeting">Estimado/a <strong>${cliente.nombre}</strong>,</p>
    <p>Le hacemos llegar la cotización solicitada para su revisión.</p>

    <div class="info-box">
      <strong>Detalles de la cotización</strong><br>
      <strong>N° Cotización:</strong> ${cotizacion.numero_cotizacion}<br>
      ${cotizacion.asunto ? '<strong>Asunto:</strong> ' + cotizacion.asunto + '<br>' : ''}
      ${cotizacion.proyecto_nombre ? '<strong>Proyecto:</strong> ' + cotizacion.proyecto_nombre + '<br>' : ''}
      <strong>Total:</strong> ${total}<br>
      <strong>Válido hasta:</strong> ${cotizacion.fecha_validez || '—'}
    </div>

    <p>El detalle completo de ítems, condiciones y observaciones se encuentra en el documento adjunto.</p>

    <p>Si tiene alguna duda o desea aprobar la cotización, por favor contáctenos.</p>

    <p>Atentamente,<br>
    <strong>Equipo de ${empresa?.nombre_empresa || 'la empresa'}</strong></p>
  `;
  return wrap(empresa, contenido);
}

export function plantillaProyecto({ empresa, cliente, proyecto }) {
  const contenido = `
    <p class="greeting">Estimado/a <strong>${cliente.nombre}</strong>,</p>
    <p>Adjuntamos la información del proyecto para su referencia.</p>

    <div class="info-box">
      <strong>Detalles del proyecto</strong><br>
      <strong>N° Proyecto:</strong> ${proyecto.numero_proyecto}<br>
      <strong>Nombre:</strong> ${proyecto.nombre}<br>
      ${proyecto.descripcion ? '<strong>Descripción:</strong> ' + proyecto.descripcion + '<br>' : ''}
      <strong>Estado:</strong> ${proyecto.estado || '—'}
    </div>

    <p>Quedamos atentos para cualquier consulta sobre el avance del proyecto.</p>

    <p>Atentamente,<br>
    <strong>Equipo de ${empresa?.nombre_empresa || 'la empresa'}</strong></p>
  `;
  return wrap(empresa, contenido);
}

export function plantillaPago({ empresa, cliente, pago }) {
  const monto = Number(pago.monto || 0).toLocaleString('es-PA', {
    style: 'currency', currency: 'PAB', minimumFractionDigits: 2,
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
      ${pago.proyecto_nombre ? '<strong>Proyecto:</strong> ' + pago.proyecto_nombre : ''}
    </div>

    <p>Gracias por su pago.</p>

    <p>Atentamente,<br>
    <strong>Equipo de ${empresa?.nombre_empresa || 'la empresa'}</strong></p>
  `;
  return wrap(empresa, contenido);
}
