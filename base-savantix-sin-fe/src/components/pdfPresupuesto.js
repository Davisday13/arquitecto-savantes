import jsPDF from 'jspdf';

// =========================================================
// COLORES
// =========================================================
const SAVANTE_BLUE       = [0, 49, 83];        // #003153
const SAVANTE_BLUE_LIGHT = [219, 234, 245];
const SAVANTE_GOLD       = [201, 162, 39];     // acento decorativo
const GRAY_900 = [17, 24, 39];
const GRAY_700 = [55, 65, 81];
const GRAY_500 = [107, 114, 128];
const GRAY_300 = [209, 213, 219];
const GRAY_50  = [249, 250, 251];

// =========================================================
// HELPERS
// =========================================================
const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('es-PA', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch { return '—'; }
};

const fmtMoney = (n) => {
  const v = Number(n || 0);
  return 'USD ' + v.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const setFill = (doc, c) => doc.setFillColor(c[0], c[1], c[2]);
const setText = (doc, c) => doc.setTextColor(c[0], c[1], c[2]);
const setDraw = (doc, c) => doc.setDrawColor(c[0], c[1], c[2]);

function estadoPill(doc, x, y, estado) {
  const map = {
    BORRADOR:   { label: 'BORRADOR',   bg: GRAY_300,   fg: GRAY_700 },
    ENVIADO:    { label: 'ENVIADO',    bg: SAVANTE_BLUE_LIGHT, fg: SAVANTE_BLUE },
    APROBADO:   { label: 'APROBADO',   bg: [220, 252, 231], fg: [21, 128, 61] },
    RECHAZADO:  { label: 'RECHAZADO',  bg: [254, 226, 226], fg: [185, 28, 28] },
    VENCIDO:    { label: 'VENCIDO',    bg: [254, 243, 199], fg: [146, 64, 14] },
    CONVERTIDO: { label: 'CONVERTIDO', bg: [243, 232, 255], fg: [109, 40, 217] },
    CANCELADO:  { label: 'CANCELADO',  bg: GRAY_300,   fg: GRAY_700 },
  };
  const e = map[estado] || map.BORRADOR;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const tw = doc.getTextWidth(e.label) + 6;
  setFill(doc, e.bg);
  doc.roundedRect(x, y - 3.5, tw, 5, 2, 2, 'F');
  setText(doc, e.fg);
  doc.text(e.label, x + 3, y);
}

function drawInfoBox(doc, x, y, w, h, title, rows) {
  setFill(doc, GRAY_50);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  setDraw(doc, GRAY_300);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  setText(doc, GRAY_500);
  doc.text(title.toUpperCase(), x + 3, y + 4);

  doc.setFontSize(9);
  let cy = y + 9;
  rows.forEach(([k, v]) => {
    if (k) {
      doc.setFont('helvetica', 'normal');
      setText(doc, GRAY_500);
      doc.text(k, x + 3, cy);
    }
    doc.setFont('helvetica', 'bold');
    setText(doc, GRAY_900);
    const txt = String(v || '—');
    const lines = doc.splitTextToSize(txt, w - 6);
    doc.text(lines, x + 3, cy + (k ? 4 : 0));
    cy += (lines.length * 4) + (k ? 4 : 1);
  });
}

// =========================================================
// FUNCIÓN PRINCIPAL
// =========================================================
export function generarPDFPresupuesto(presupuesto, items = [], empresa = {}, opciones = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - 2 * margin;
  let y = margin;

  // ============================================================
  // HEADER LIMPIO EN BLANCO
  // ============================================================
  const headerY = margin;
  const headerH = 28;

  // Logo (sin fondo blanco superpuesto)
  if (empresa?.logo_url) {
    try {
      doc.addImage(empresa.logo_url, 'PNG', margin, headerY, 22, 22);
    } catch (e) { /* ignorar */ }
  }

  // Datos empresa al lado del logo
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  setText(doc, SAVANTE_BLUE);
  doc.text(empresa?.nombre_empresa || 'Savante Solutions', margin + 26, headerY + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setText(doc, GRAY_700);
  let dy = headerY + 11;
  if (empresa?.ruc) {
    doc.text(`RUC ${empresa.ruc}${empresa.dv ? '-' + empresa.dv : ''}`, margin + 26, dy);
    dy += 4;
  }
  if (empresa?.telefono) {
    doc.text(`Tel: ${empresa.telefono}`, margin + 26, dy);
    dy += 4;
  }
  if (empresa?.correo) {
    doc.text(empresa.correo, margin + 26, dy);
    dy += 4;
  }

  // Título PRESUPUESTO + número (esquina derecha)
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  setText(doc, SAVANTE_BLUE);
  doc.text('PRESUPUESTO', pageW - margin, headerY + 8, { align: 'right' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  setText(doc, GRAY_700);
  doc.text(presupuesto.numero_presupuesto || '', pageW - margin, headerY + 15, { align: 'right' });

  // Línea decorativa azul (sin dorado)
  y = headerY + headerH + 2;
  setDraw(doc, SAVANTE_BLUE);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);

  doc.setLineWidth(0.2);
  y += 6;

  // ============================================================
  // BANDA DE METADATOS: fecha emisión, validez, estado
  // ============================================================
  setFill(doc, GRAY_50);
  doc.rect(margin, y, contentW, 12, 'F');
  setDraw(doc, GRAY_300);
  doc.rect(margin, y, contentW, 12, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setText(doc, GRAY_500);
  doc.text('FECHA EMISIÓN', margin + 3, y + 4);
  doc.text('VÁLIDO HASTA', margin + 60, y + 4);
  doc.text('ESTADO', margin + 120, y + 4);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  setText(doc, GRAY_900);
  doc.text(fmtDate(presupuesto.fecha_emision), margin + 3, y + 10);
  doc.text(fmtDate(presupuesto.fecha_validez), margin + 60, y + 10);

  estadoPill(doc, margin + 120, y + 9, presupuesto.estado);

  y += 16;

  // ============================================================
  // CLIENTE Y DETALLES (2 cajas lado a lado)
  // ============================================================
  const colW = (contentW - 4) / 2;

  const clienteRows = [
    ['Nombre', presupuesto.cliente_nombre],
    presupuesto.cliente_ruc ? ['RUC', presupuesto.cliente_ruc + (presupuesto.cliente_dv ? '-' + presupuesto.cliente_dv : '')] : null,
    presupuesto.cliente_telefono ? ['Teléfono', presupuesto.cliente_telefono] : null,
    presupuesto.cliente_correo ? ['Correo', presupuesto.cliente_correo] : null,
  ].filter(Boolean);

  drawInfoBox(doc, margin, y, colW, 30, 'CLIENTE', clienteRows);

  const tipoLabel = {
    TALLER: 'Servicio en Taller',
    VISITA: 'Visita Técnica',
    VENTA_DIRECTA: 'Venta Directa',
  }[presupuesto.tipo_destino] || presupuesto.tipo_destino;

  const tipoRows = [['Tipo de servicio', tipoLabel]];
  if (presupuesto.tipo_destino === 'TALLER' && presupuesto.equipo_marca) {
    tipoRows.push(['Equipo', `${presupuesto.tipo_equipo || ''} ${presupuesto.equipo_marca} ${presupuesto.equipo_modelo || ''}`.trim()]);
    if (presupuesto.equipo_serie) tipoRows.push(['N° Serie', presupuesto.equipo_serie]);
  }
  if (presupuesto.asunto) tipoRows.push(['Asunto', presupuesto.asunto]);

  drawInfoBox(doc, margin + colW + 4, y, colW, 30, 'DETALLES DEL PRESUPUESTO', tipoRows);

  y += 34;

  // ============================================================
  // TABLA DE ITEMS
  // ============================================================
  setFill(doc, SAVANTE_BLUE);
  doc.rect(margin, y, contentW, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setText(doc, [255, 255, 255]);
  doc.text('DESCRIPCIÓN', margin + 3, y + 4.5);
  doc.text('CANT.', margin + 110, y + 4.5, { align: 'right' });
  doc.text('PRECIO U.', margin + 138, y + 4.5, { align: 'right' });
  doc.text('ITBMS', margin + 158, y + 4.5, { align: 'right' });
  doc.text('SUBTOTAL', margin + contentW - 3, y + 4.5, { align: 'right' });

  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  let altRow = false;
  items.forEach((it) => {
    const desc = it.descripcion || '';
    const descLines = doc.splitTextToSize(desc, 100);
    const rowH = Math.max(8, descLines.length * 4 + 3);

    if (y + rowH > pageH - 60) {
      doc.addPage();
      y = margin;
      setFill(doc, SAVANTE_BLUE);
      doc.rect(margin, y, contentW, 7, 'F');
      doc.setFont('helvetica', 'bold');
      setText(doc, [255, 255, 255]);
      doc.text('DESCRIPCIÓN', margin + 3, y + 4.5);
      doc.text('CANT.', margin + 110, y + 4.5, { align: 'right' });
      doc.text('PRECIO U.', margin + 138, y + 4.5, { align: 'right' });
      doc.text('ITBMS', margin + 158, y + 4.5, { align: 'right' });
      doc.text('SUBTOTAL', margin + contentW - 3, y + 4.5, { align: 'right' });
      y += 7;
      doc.setFont('helvetica', 'normal');
    }

    if (altRow) {
      // Color zebra más visible (era GRAY_50, ahora un poco más oscuro)
      doc.setFillColor(241, 245, 249); // slate-100, mejor contraste
      doc.rect(margin, y, contentW, rowH, 'F');
    }
    altRow = !altRow;

    setText(doc, GRAY_900);
    doc.text(descLines, margin + 3, y + 4.5);

    // SKU eliminado a pedido del cliente — se veía perdido y poco profesional

    doc.text(Number(it.cantidad).toFixed(2), margin + 110, y + 4.5, { align: 'right' });
    doc.text(fmtMoney(it.precio_unitario), margin + 138, y + 4.5, { align: 'right' });
    doc.text(`${Number(it.itbms_pct).toFixed(0)}%`, margin + 158, y + 4.5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    const subt = Number(it.cantidad) * Number(it.precio_unitario);
    doc.text(fmtMoney(subt), margin + contentW - 3, y + 4.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += rowH;
  });

  setDraw(doc, GRAY_300);
  doc.line(margin, y, margin + contentW, y);
  y += 4;

  // ============================================================
  // TOTALES (caja a la derecha) + notas a la izquierda
  // ============================================================
  // TOTALES (caja a la derecha) + CUENTAS BANCARIAS (caja izquierda)
  // ============================================================
  const totalesX = margin + contentW - 80;
  const totalesW = 80;
  const cuentasW = contentW - totalesW - 4;

  // Determinar si hay descuento
  const tieneDescuento = presupuesto.descuento_tipo &&
                         Number(presupuesto.descuento_monto_calculado) > 0;
  const cajaTotalesH = tieneDescuento ? 32 : 26;

  // Caja totales
  setFill(doc, GRAY_50);
  doc.rect(totalesX, y, totalesW, cajaTotalesH, 'F');
  setDraw(doc, GRAY_300);
  doc.rect(totalesX, y, totalesW, cajaTotalesH, 'S');

  doc.setFontSize(9);
  setText(doc, GRAY_700);
  doc.setFont('helvetica', 'normal');

  doc.text('Subtotal:', totalesX + 3, y + 6);
  doc.text(fmtMoney(presupuesto.subtotal_sin_itbms), totalesX + totalesW - 3, y + 6, { align: 'right' });

  doc.text('ITBMS:', totalesX + 3, y + 12);
  doc.text(fmtMoney(presupuesto.total_itbms), totalesX + totalesW - 3, y + 12, { align: 'right' });

  let yTotal = y + 22; // posición default

  if (tieneDescuento) {
    // Mostrar descuento
    setText(doc, [217, 119, 6]); // ámbar
    const descLabel = presupuesto.descuento_tipo === 'PORCENTAJE'
      ? `Descuento (${Number(presupuesto.descuento_valor).toFixed(0)}%):`
      : 'Descuento:';
    doc.text(descLabel, totalesX + 3, y + 18);
    doc.text('− ' + fmtMoney(presupuesto.descuento_monto_calculado),
             totalesX + totalesW - 3, y + 18, { align: 'right' });
    setText(doc, GRAY_700);
    yTotal = y + 28;
  }

  setDraw(doc, GRAY_300);
  doc.line(totalesX + 3, yTotal - 8, totalesX + totalesW - 3, yTotal - 8);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  setText(doc, SAVANTE_BLUE);
  doc.text('TOTAL:', totalesX + 3, yTotal);
  // Calcular total con descuento
  const totalFinal = tieneDescuento
    ? Number(presupuesto.total_general) - Number(presupuesto.descuento_monto_calculado)
    : Number(presupuesto.total_general);
  doc.text(fmtMoney(totalFinal), totalesX + totalesW - 3, yTotal, { align: 'right' });

  // Caja CUENTAS BANCARIAS (a la izquierda, mismo alto que totales)
  if (empresa?.cuentas_bancarias) {
    setFill(doc, SAVANTE_BLUE_LIGHT); // azul Savante claro
    doc.rect(margin, y, cuentasW, cajaTotalesH, 'F');
    setDraw(doc, SAVANTE_BLUE);
    doc.setLineWidth(0.4);
    doc.rect(margin, y, cuentasW, cajaTotalesH, 'S');
    doc.setLineWidth(0.2);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    setText(doc, SAVANTE_BLUE);
    doc.text('CUENTAS PARA PAGO', margin + 3, y + 4);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    setText(doc, GRAY_900);
    const cuentasLines = doc.splitTextToSize(empresa.cuentas_bancarias, cuentasW - 6);
    // Mostrar máximo las líneas que caben (alto dinámico según hay descuento o no)
    const altoUtil = cajaTotalesH - 6;
    const lineasCaben = Math.floor(altoUtil / 3);
    doc.text(cuentasLines.slice(0, lineasCaben), margin + 3, y + 8);
  }

  y += cajaTotalesH + 4;

  // ============================================================
  // VALIDEZ DEL PRESUPUESTO (banda azul Savante claro)
  // ============================================================
  setFill(doc, SAVANTE_BLUE_LIGHT);
  doc.rect(margin, y, contentW, 7, 'F');
  setDraw(doc, SAVANTE_BLUE);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin, y + 7);
  doc.setLineWidth(0.2);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setText(doc, SAVANTE_BLUE);
  doc.text(
    `Presupuesto válido hasta el ${fmtDate(presupuesto.fecha_validez)}`,
    margin + 3,
    y + 4.8,
  );
  y += 10;

  // ============================================================
  // OBSERVACIONES — caja destacada (no plana)
  // ============================================================
  if (presupuesto.observaciones) {
    const obsLines = doc.splitTextToSize(presupuesto.observaciones, contentW - 6);
    const altoObs = 6 + obsLines.length * 4 + 4;

    if (y + altoObs > pageH - 18) {
      doc.addPage();
      y = margin;
    }

    // Header en azul Savante OSCURO con texto blanco
    setFill(doc, SAVANTE_BLUE);
    doc.rect(margin, y, contentW, 6, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setText(doc, [255, 255, 255]); // texto blanco
    doc.text('OBSERVACIONES', margin + 3, y + 4);
    y += 6;

    // Cuerpo con borde lateral
    setDraw(doc, SAVANTE_BLUE_LIGHT);
    doc.setLineWidth(0.4);
    doc.line(margin, y, margin, y + obsLines.length * 4 + 3); // borde izquierdo
    doc.setLineWidth(0.2);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    setText(doc, GRAY_900);
    doc.text(obsLines, margin + 3, y + 3);
    y += obsLines.length * 4 + 5;
  }

  // ============================================================
  // CONDICIONES — optimizado para evitar página vacía
  // ============================================================
  if (presupuesto.condiciones) {
    // Calcular altura real de los términos
    doc.setFontSize(7.5);
    const condLines = doc.splitTextToSize(presupuesto.condiciones, contentW);
    const altoTotal = 6 + condLines.length * 3 + 3; // banda + texto + padding

    // Solo saltar si REALMENTE no cabe (deja 18mm para footer)
    if (y + altoTotal > pageH - 18) {
      doc.addPage();
      y = margin;
    }

    // Banda título en azul Savante OSCURO con texto blanco
    setFill(doc, SAVANTE_BLUE);
    doc.rect(margin, y, contentW, 6, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setText(doc, [255, 255, 255]); // texto blanco
    doc.text('TÉRMINOS Y CONDICIONES', margin + 3, y + 4);
    y += 9; // ✨ +3mm de espacio antes del primer término (antes 6.5)

    // Texto compacto
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    setText(doc, GRAY_700);
    doc.text(condLines, margin, y);
    y += condLines.length * 3 + 2;
  }

  // ============================================================
  // FIRMA — con MÁS espacio arriba
  // ============================================================
  if (presupuesto.firma_cliente && presupuesto.estado === 'APROBADO') {
    const espacioNecesario = 45;
    if (y + espacioNecesario > pageH - 25) {
      doc.addPage();
      y = margin;
    }
    y += 12; // ✨ más aire arriba

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setText(doc, GRAY_500);
    doc.text('FIRMA DEL CLIENTE — APROBADO', margin, y);
    y += 4;

    try {
      doc.addImage(presupuesto.firma_cliente, 'PNG', margin, y, 60, 25);
    } catch (e) { /* skip */ }

    setDraw(doc, GRAY_500);
    doc.line(margin, y + 27, margin + 70, y + 27);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    setText(doc, GRAY_700);
    if (presupuesto.aprobado_por_nombre) {
      doc.text(presupuesto.aprobado_por_nombre, margin, y + 31);
    }
    if (presupuesto.fecha_aprobacion) {
      doc.text(`Fecha: ${fmtDate(presupuesto.fecha_aprobacion)}`, margin, y + 35);
    }
    y += 40;
  } else if (presupuesto.requiere_firma) {
    const espacioNecesario = 40;
    if (y + espacioNecesario > pageH - 25) {
      doc.addPage();
      y = margin;
    }
    y += 18; // ✨ más aire arriba

    setDraw(doc, GRAY_500);
    doc.line(margin, y, margin + 70, y);
    doc.line(pageW - margin - 70, y, pageW - margin, y);
    doc.setFontSize(8);
    setText(doc, GRAY_500);
    doc.text('Firma del cliente', margin, y + 4);
    doc.text('Aceptado y aprobado', pageW - margin - 70, y + 4);
    y += 10;
  }

  // ============================================================
  // FOOTER
  // ============================================================
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    setDraw(doc, GRAY_300);
    doc.setLineWidth(0.2);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    setText(doc, GRAY_500);

    const footerY = pageH - 8;
    if (empresa?.direccion) {
      doc.text(empresa.direccion, margin, footerY);
    }
    if (empresa?.pie_pagina_pdf) {
      doc.text(empresa.pie_pagina_pdf, pageW / 2, footerY, { align: 'center' });
    }
    doc.text(`Página ${i} de ${totalPages}`, pageW - margin, footerY, { align: 'right' });

    doc.text(presupuesto.numero_presupuesto || '', margin, pageH - 4);
  }

  const nombreArchivo = `Presupuesto-${presupuesto.numero_presupuesto}.pdf`;

  if (opciones.soloBlob) {
    return { blob: doc.output('blob'), nombre: nombreArchivo };
  }

  doc.save(nombreArchivo);
  return { blob: doc.output('blob'), nombre: nombreArchivo };
}
