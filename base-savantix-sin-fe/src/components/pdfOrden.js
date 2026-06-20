import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ESTADOS_ORDEN_LABEL } from '../lib/constants';

// ===================================================================
// COLORES — azul Savante Solutions oficial #003153 (Prussian Blue)
// ===================================================================
const SAVANTE_BLUE       = [0, 49, 83];        // #003153
const SAVANTE_BLUE_LIGHT = [219, 234, 245];    // tono claro
const GRAY_900 = [17, 24, 39];
const GRAY_700 = [55, 65, 81];
const GRAY_500 = [107, 114, 128];
const GRAY_300 = [209, 213, 219];
const GRAY_100 = [243, 244, 246];
const GRAY_50  = [249, 250, 251];

const fmtDate = (d) => {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-PA', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const fmtMoney = (n) => {
  const num = Number(n) || 0;
  return new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(num);
};

const setFill = (doc, c) => doc.setFillColor(c[0], c[1], c[2]);
const setText = (doc, c) => doc.setTextColor(c[0], c[1], c[2]);
const setDraw = (doc, c) => doc.setDrawColor(c[0], c[1], c[2]);

/**
 * Caja con título azul arriba (estilo CLIENTE / EQUIPO)
 */
function drawInfoBox(doc, x, y, w, h, title, rows) {
  setDraw(doc, GRAY_300);
  setFill(doc, GRAY_50);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');

  setText(doc, SAVANTE_BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(title.toUpperCase(), x + 3, y + 4.5);

  setDraw(doc, GRAY_300);
  doc.setLineWidth(0.2);
  doc.line(x, y + 6, x + w, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  let yi = y + 10;
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    setText(doc, GRAY_500);
    doc.text(label, x + 3, yi);
    doc.setFont('helvetica', 'normal');
    setText(doc, GRAY_900);
    const v = value || '-';
    const lines = doc.splitTextToSize(String(v), w - 28);
    doc.text(lines, x + 25, yi);
    yi += 4 + (lines.length - 1) * 3;
  });
}

/**
 * Pill de estado con color según el estado
 */
function estadoPill(doc, x, y, estado) {
  const colorMap = {
    RECIBIDO:           { bg: GRAY_100, fg: GRAY_700 },
    DIAGNOSTICO:        { bg: SAVANTE_BLUE_LIGHT, fg: SAVANTE_BLUE },
    ESPERANDO_REPUESTO: { bg: [255, 251, 235], fg: [217, 119, 6] },
    REPARACION:         { bg: [237, 233, 254], fg: [109, 40, 217] },
    PRUEBAS:            { bg: [224, 231, 255], fg: [67, 56, 202] },
    LISTO:              { bg: [209, 250, 229], fg: [5, 150, 105] },
    ENTREGADO:          { bg: [209, 250, 229], fg: [5, 150, 105] },
    CANCELADO:          { bg: [254, 242, 242], fg: [220, 38, 38] },
  };
  const c = colorMap[estado] || colorMap.RECIBIDO;
  const label = (ESTADOS_ORDEN_LABEL[estado] || estado).toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const w = doc.getTextWidth(label) + 6;
  setFill(doc, c.bg);
  doc.roundedRect(x, y, w, 5, 1, 1, 'F');
  setText(doc, c.fg);
  doc.text(label, x + 3, y + 3.5);
  return w;
}

/**
 * Banda completa de ancho con título y contenido (FALLA, DIAGNÓSTICO, SOLUCIÓN)
 */
function drawFullWidthBand(doc, x, y, w, title, content) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(content || '-', w - 6);
  const titleH = 6;
  const contentH = lines.length * 4 + 4;
  const totalH = titleH + contentH;

  // Marco
  setDraw(doc, GRAY_300);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, totalH, 1.5, 1.5, 'S');

  // Header con fondo gris claro
  setFill(doc, GRAY_100);
  doc.rect(x + 0.3, y + 0.3, w - 0.6, titleH - 0.3, 'F');
  setDraw(doc, GRAY_300);
  doc.line(x, y + titleH, x + w, y + titleH);

  // Título azul Savante
  setText(doc, SAVANTE_BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(title.toUpperCase(), x + 3, y + 4);

  // Contenido
  setText(doc, GRAY_900);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(lines, x + 3, y + titleH + 4);

  return y + totalH;
}

/**
 * Genera y descarga el PDF de una orden de taller.
 */
export function generarPDFOrden(orden, repuestos = [], manoObra = [], empresa = {}, opciones = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - 2 * margin;
  let y = margin;

  // ===================================================================
  // ENCABEZADO: logo + datos empresa + caja del ticket
  // ===================================================================
  let logoOk = false;
  if (empresa?.logo_url) {
    try {
      doc.addImage(empresa.logo_url, 'PNG', margin, y, 18, 18, undefined, 'FAST');
      logoOk = true;
    } catch (err) { /* ignorar */ }
  }

  const xEmp = logoOk ? margin + 22 : margin;
  setText(doc, GRAY_900);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(empresa?.nombre_empresa || 'Soporte Técnico', xEmp, y + 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  let yEmp = y + 9;
  if (empresa?.ruc) {
    const ruc = empresa.dv ? `${empresa.ruc} DV: ${empresa.dv}` : empresa.ruc;
    doc.text(`RUC: ${ruc}`, xEmp, yEmp); yEmp += 3.5;
  }
  if (empresa?.telefono) { doc.text(`Tel: ${empresa.telefono}`, xEmp, yEmp); yEmp += 3.5; }
  if (empresa?.correo) { doc.text(`Correo: ${empresa.correo}`, xEmp, yEmp); yEmp += 3.5; }
  if (empresa?.direccion) {
    const lines = doc.splitTextToSize(empresa.direccion, 110);
    doc.text(lines.slice(0, 1), xEmp, yEmp);
  }

  // Caja del ticket a la derecha (con borde azul Savante)
  const boxX = pageW - margin - 60;
  setDraw(doc, SAVANTE_BLUE);
  doc.setLineWidth(0.5);
  doc.rect(boxX, y, 60, 22);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setText(doc, GRAY_900);
  doc.text('ORDEN DE TALLER', boxX + 30, y + 5, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setText(doc, SAVANTE_BLUE);
  doc.text(orden.numero_ticket || '', boxX + 30, y + 12, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setText(doc, GRAY_900);
  doc.text(`Fecha: ${fmtDate(orden.fecha_entrada)}`, boxX + 30, y + 18, { align: 'center' });

  y += 26;

  // ===================================================================
  // CLIENTE Y EQUIPO (lado a lado, cajas con título azul)
  // ===================================================================
  const colW = (contentW - 4) / 2;
  const boxH = 32;

  drawInfoBox(doc, margin, y, colW, boxH, 'Cliente', [
    ['Nombre:', orden.cliente_nombre || ''],
    ['Código:', orden.numero_cliente || ''],
    ['RUC/Cédula:', orden.cliente_ruc_cedula
      ? (orden.cliente_dv ? `${orden.cliente_ruc_cedula} DV: ${orden.cliente_dv}` : orden.cliente_ruc_cedula)
      : '-'],
    ['Teléfono:', orden.cliente_telefono || '-'],
    ['Correo:', orden.cliente_correo || '-'],
  ]);

  drawInfoBox(doc, margin + colW + 4, y, colW, boxH, 'Equipo', [
    ['Tipo:', orden.tipo_equipo || '-'],
    ['Marca/Mod:', `${orden.marca || ''} ${orden.modelo || ''}`.trim() || '-'],
    ['N° Serie:', orden.numero_serie || '-'],
    ['Ubicación:', orden.ubicacion || '-'],
  ]);

  y += boxH + 5;

  // ===================================================================
  // BLOQUE INFO: Estado · Técnico · Fecha entrada · Fecha entrega
  // ===================================================================
  setFill(doc, GRAY_50);
  setDraw(doc, GRAY_300);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 14, 1.5, 1.5, 'FD');

  const cols = [
    { label: 'ESTADO ACTUAL', value: null, isPill: true },
    { label: 'TÉCNICO ASIGNADO', value: orden.tecnico_nombre || 'Sin asignar' },
    { label: 'FECHA ENTRADA', value: fmtDate(orden.fecha_entrada) },
    { label: 'FECHA ENTREGA', value: orden.fecha_entrega ? fmtDate(orden.fecha_entrega) : '—' },
  ];
  const cellW = contentW / cols.length;
  cols.forEach((col, i) => {
    const cx = margin + i * cellW + 3;
    setText(doc, GRAY_500);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(col.label, cx, y + 4);
    if (col.isPill) {
      estadoPill(doc, cx, y + 6, orden.estado);
    } else {
      setText(doc, GRAY_900);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(col.value, cellW - 6);
      doc.text(lines.slice(0, 1), cx, y + 10);
    }
    if (i < cols.length - 1) {
      setDraw(doc, GRAY_300);
      doc.setLineWidth(0.2);
      doc.line(margin + (i + 1) * cellW, y + 2, margin + (i + 1) * cellW, y + 12);
    }
  });

  y += 18;

  // ===================================================================
  // FALLA REPORTADA (banda completa de ancho)
  // ===================================================================
  if (orden.falla_reportada) {
    if (y > pageH - 50) { doc.addPage(); y = margin; }
    y = drawFullWidthBand(doc, margin, y, contentW, 'Falla reportada', orden.falla_reportada);
    y += 4;
  }

  // ===================================================================
  // DIAGNÓSTICO (banda completa de ancho)
  // ===================================================================
  if (orden.diagnostico) {
    if (y > pageH - 50) { doc.addPage(); y = margin; }
    y = drawFullWidthBand(doc, margin, y, contentW, 'Diagnóstico técnico', orden.diagnostico);
    y += 4;
  }

  // ===================================================================
  // TABLA UNIFICADA: Repuestos + Mano de obra (con columna Tipo)
  // ===================================================================
  const tieneItems = repuestos.length > 0 || manoObra.length > 0;

  if (tieneItems) {
    if (y > pageH - 60) { doc.addPage(); y = margin; }

    // Construir filas unificadas
    const filasUnificadas = [];
    repuestos.forEach((r) => {
      filasUnificadas.push([
        filasUnificadas.length + 1,
        'Repuesto',
        r.descripcion,
        String(r.cantidad),
        fmtMoney(r.precio_unitario),
        `${Number(r.itbms_pct ?? 7)}%`,
        fmtMoney(r.subtotal),
      ]);
    });
    manoObra.forEach((m) => {
      filasUnificadas.push([
        filasUnificadas.length + 1,
        'Mano de obra',
        m.descripcion,
        `${m.horas}`,
        fmtMoney(m.precio_hora),
        `${Number(m.itbms_pct ?? 7)}%`,
        fmtMoney(m.subtotal),
      ]);
    });

    autoTable(doc, {
      startY: y,
      theme: 'plain',
      headStyles: {
        fillColor: SAVANTE_BLUE,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 2,
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: GRAY_900,
        lineColor: GRAY_300,
        lineWidth: 0.1,
      },
      head: [['#', 'Tipo', 'Descripción', 'Cant.', 'P. Unit.', 'ITBMS', 'Subtotal']],
      body: filasUnificadas,
      didParseCell: (data) => {
        if (data.section === 'body') {
          data.cell.styles.lineWidth = { top: 0, right: 0, bottom: 0.1, left: 0 };
          data.cell.styles.lineColor = GRAY_300;
        }
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 22, halign: 'left', fontStyle: 'bold', textColor: SAVANTE_BLUE },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 16, halign: 'center' },
        6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  // ===================================================================
  // SOLUCIÓN APLICADA — DESPUÉS de la tabla unificada
  // ===================================================================
  if (orden.solucion) {
    if (y > pageH - 50) { doc.addPage(); y = margin; }
    y = drawFullWidthBand(doc, margin, y, contentW, 'Solución aplicada', orden.solucion);
    y += 4;
  }

  // ===================================================================
  // INDICADORES + TOTALES (lado a lado)
  // ===================================================================
  if (y > pageH - 50) { doc.addPage(); y = margin; }

  const totalRepuestos = Number(orden.total_repuestos || 0);
  const totalManoObra = Number(orden.total_mano_obra || 0);
  const costoDiag = Number(orden.costo_diagnostico || 0);
  const repAutorizada = !!orden.reparacion_autorizada;
  const diagPagado = !!orden.diagnostico_pagado;
  const totalGeneral = Number(orden.total_general || 0);

  // Indicadores a la izquierda
  setText(doc, GRAY_700);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  let yi = y + 2;
  if (costoDiag > 0) {
    doc.text(
      `Diagnóstico: ${diagPagado ? `PAGADO${orden.diagnostico_metodo_pago ? ' (' + orden.diagnostico_metodo_pago + ')' : ''}` : 'pendiente de pago'}`,
      margin, yi
    );
    yi += 4;
  }
  if (repAutorizada) {
    doc.text('Reparación autorizada por el cliente', margin, yi);
    yi += 4;
  } else if (orden.diagnostico) {
    doc.text('Reparación pendiente de autorizar', margin, yi);
    yi += 4;
  }

  // Caja de totales a la derecha — con desglose ITBMS
  const totW = 80;
  const totX = pageW - margin - totW;

  // Construimos las filas de subtotales: Subtotal sin ITBMS · ITBMS por tasa · TOTAL
  const subRep = Number(orden.subtotal_repuestos_sin_itbms || 0);
  const subMo = Number(orden.subtotal_mo_sin_itbms || 0);
  const subDiag = Number(orden.subtotal_diagnostico_sin_itbms || 0);
  const itbmsRep = Number(orden.itbms_repuestos || 0);
  const itbmsMo = Number(orden.itbms_mo || 0);
  const itbmsDiag = Number(orden.itbms_diagnostico || 0);
  const incluirDiag = costoDiag > 0 && (!repAutorizada || !diagPagado);
  const subtotalGeneral = subRep + subMo + (incluirDiag ? subDiag : 0);
  const itbmsTotal = itbmsRep + itbmsMo + (incluirDiag ? itbmsDiag : 0);

  // Agrupar ITBMS por tasa para mostrarlo cuando hay distintas
  const tasasMap = {};
  const acumular = (sub, imp, pct) => {
    if (sub === 0 && imp === 0) return;
    const key = String(Number(pct ?? 7));
    if (!tasasMap[key]) tasasMap[key] = { sub: 0, imp: 0 };
    tasasMap[key].sub += sub;
    tasasMap[key].imp += imp;
  };
  // No tenemos por-tasa exacto en la vista de totales, recalculamos desde items
  repuestos.forEach(r => {
    const pct = Number(r.itbms_pct ?? 7);
    const monto = Number(r.subtotal || 0);
    const tasa = pct / 100;
    const sub = Math.round((monto / (1 + tasa)) * 100) / 100;
    const imp = Math.round((monto - sub) * 100) / 100;
    acumular(sub, imp, pct);
  });
  manoObra.forEach(m => {
    const pct = Number(m.itbms_pct ?? 7);
    const monto = Number(m.subtotal || 0);
    const tasa = pct / 100;
    const sub = Math.round((monto / (1 + tasa)) * 100) / 100;
    const imp = Math.round((monto - sub) * 100) / 100;
    acumular(sub, imp, pct);
  });
  if (incluirDiag) {
    const pct = Number(orden.diagnostico_itbms_pct ?? 7);
    acumular(subDiag, itbmsDiag, pct);
  }

  const tasasOrdenadas = Object.entries(tasasMap).sort((a, b) => Number(a[0]) - Number(b[0]));

  // Filas: Subtotal · ITBMS por tasa · (descuento de diag si autorizó) · TOTAL
  const filas = [];
  filas.push(['Subtotal:', fmtMoney(subtotalGeneral), false]);
  tasasOrdenadas.forEach(([pct, { imp }]) => {
    if (imp === 0 && Number(pct) === 0) {
      filas.push([`Exentos (0%):`, fmtMoney(0), false]);
    } else if (imp > 0) {
      filas.push([`ITBMS ${pct}%:`, fmtMoney(imp), false]);
    }
  });
  if (repAutorizada && diagPagado && costoDiag > 0) {
    filas.push(['Diagnóstico descontado:', `-${fmtMoney(costoDiag)}`, true]);
  }

  const totH = filas.length * 5 + 14;
  setDraw(doc, GRAY_300);
  doc.setLineWidth(0.3);
  doc.rect(totX, y, totW, totH);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  let yt = y + 5;
  filas.forEach(([label, value, isDiscount]) => {
    setText(doc, GRAY_900);
    doc.text(label, totX + 3, yt);
    if (isDiscount) setText(doc, [220, 38, 38]);
    doc.text(value, totX + totW - 3, yt, { align: 'right' });
    setText(doc, GRAY_900);
    yt += 5;
  });

  yt += 1;
  setDraw(doc, GRAY_300);
  doc.setLineWidth(0.5);
  doc.line(totX + 3, yt - 1, totX + totW - 3, yt - 1);
  yt += 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setText(doc, SAVANTE_BLUE);
  doc.text('TOTAL:', totX + 3, yt);
  doc.text(fmtMoney(totalGeneral), totX + totW - 3, yt, { align: 'right' });
  setText(doc, GRAY_900);

  y += totH + 6;

  // ===================================================================
  // FIRMAS DE RECEPCIÓN Y ENTREGA (lado a lado)
  // ===================================================================
  if (y > pageH - 50) { doc.addPage(); y = margin; }

  setText(doc, SAVANTE_BLUE);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('FIRMAS DEL CLIENTE', margin, y);
  setText(doc, GRAY_900);
  y += 5;

  const firmaW = (contentW - 10) / 2;
  const xFirma1 = margin;
  const xFirma2 = margin + firmaW + 10;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Al recibir el equipo', xFirma1, y);
  doc.text('Al recibir conforme', xFirma2, y);
  y += 2;

  if (orden.firma_recepcion) {
    try { doc.addImage(orden.firma_recepcion, 'PNG', xFirma1, y, 60, 22); } catch {}
  }
  if (orden.firma_entrega) {
    try { doc.addImage(orden.firma_entrega, 'PNG', xFirma2, y, 60, 22); } catch {}
  }

  setDraw(doc, GRAY_500);
  doc.setLineWidth(0.3);
  doc.line(xFirma1, y + 22, xFirma1 + 70, y + 22);
  doc.line(xFirma2, y + 22, xFirma2 + 70, y + 22);

  y += 25;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  if (orden.firma_recepcion_nombre) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Nombre: ${orden.firma_recepcion_nombre}`, xFirma1, y);
  } else {
    doc.text('Firma del cliente', xFirma1, y);
  }
  if (orden.firma_entrega_nombre) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Nombre: ${orden.firma_entrega_nombre}`, xFirma2, y);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text('Firma del cliente', xFirma2, y);
  }
  y += 6;

  // ===================================================================
  // TÉRMINOS Y CONDICIONES
  // ===================================================================
  const terminos = empresa?.terminos_orden || '';
  const dias = orden.dias_garantia || empresa?.dias_garantia || 30;

  if (terminos) {
    if (y > pageH - 40) { doc.addPage(); y = margin; }
    setText(doc, SAVANTE_BLUE);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`TÉRMINOS Y CONDICIONES · Garantía ${dias} días`, margin, y);
    y += 4;

    setText(doc, GRAY_700);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const terminosTexto = terminos.replace(/\{DIAS\}/g, dias);
    const tLines = doc.splitTextToSize(terminosTexto, contentW);
    doc.text(tLines, margin, y);
    setText(doc, GRAY_900);
    y += tLines.length * 3 + 3;
  }

  // ===================================================================
  // PIE DE PÁGINA
  // ===================================================================
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    setText(doc, GRAY_500);
    doc.setFont('helvetica', 'normal');
    if (empresa?.pie_pagina_pdf) {
      const pieLines = doc.splitTextToSize(empresa.pie_pagina_pdf, pageW - 2 * margin);
      doc.text(pieLines, pageW / 2, pageH - 8, { align: 'center' });
    }
    doc.text(`Página ${i} de ${totalPages}`, pageW - margin, pageH - 4, { align: 'right' });
    doc.text(orden.numero_ticket || '', margin, pageH - 4);
  }

  const nombreArchivo = `Orden-${orden.numero_ticket || 'taller'}.pdf`;
  if (opciones.soloBlob) {
    return { blob: doc.output('blob'), nombre: nombreArchivo };
  }
  doc.save(nombreArchivo);
  return { blob: doc.output('blob'), nombre: nombreArchivo };
}
