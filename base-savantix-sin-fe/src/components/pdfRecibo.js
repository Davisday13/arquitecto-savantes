import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Colores (consistente con pdfOrden y pdfVisita)
const SAVANTE_BLUE = [0, 49, 83];
const SAVANTE_BLUE_LIGHT = [219, 234, 245];
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

// Convertir número a palabras (simplificado, dólares americanos)
function numeroALetras(n) {
  const num = Number(n) || 0;
  const entero = Math.floor(num);
  const centavos = Math.round((num - entero) * 100);

  const unidades = ['','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE'];
  const decenas = ['','','VEINTI','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  const centenas = ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];

  const seccion = (num) => {
    if (num === 0) return '';
    if (num <= 20) return unidades[num];
    if (num < 100) {
      const d = Math.floor(num / 10);
      const u = num % 10;
      if (d === 2) return u === 0 ? 'VEINTE' : 'VEINTI' + unidades[u];
      return decenas[d] + (u ? ' Y ' + unidades[u] : '');
    }
    if (num === 100) return 'CIEN';
    const c = Math.floor(num / 100);
    const resto = num % 100;
    return centenas[c] + (resto ? ' ' + seccion(resto) : '');
  };

  let texto = '';
  if (entero === 0) texto = 'CERO';
  else if (entero < 1000) texto = seccion(entero);
  else if (entero < 1000000) {
    const miles = Math.floor(entero / 1000);
    const resto = entero % 1000;
    texto = (miles === 1 ? 'MIL' : seccion(miles) + ' MIL') + (resto ? ' ' + seccion(resto) : '');
  } else {
    texto = entero.toString(); // fallback simple
  }

  return `${texto} CON ${centavos.toString().padStart(2, '0')}/100 DÓLARES`;
}

/**
 * Genera y descarga el PDF del recibo de pago.
 */
export function generarReciboPago(pago, empresa = {}, opciones = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - 2 * margin;
  let y = margin;

  // ENCABEZADO
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
  doc.text(empresa?.nombre_empresa || 'Savantix', xEmp, y + 5);

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

  // Caja del recibo
  const boxX = pageW - margin - 70;
  setDraw(doc, SAVANTE_BLUE);
  doc.setLineWidth(0.5);
  doc.rect(boxX, y, 70, 26);

  setFill(doc, SAVANTE_BLUE);
  doc.rect(boxX, y, 70, 6, 'F');
  setText(doc, [255, 255, 255]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(pago.numero_factura ? 'RECIBO / FACTURA' : 'RECIBO DE PAGO', boxX + 35, y + 4, { align: 'center' });

  setText(doc, GRAY_900);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('N° Recibo:', boxX + 3, y + 11);
  setText(doc, SAVANTE_BLUE);
  doc.setFont('helvetica', 'bold');
  doc.text(pago.numero_recibo, boxX + 67, y + 11, { align: 'right' });

  if (pago.numero_factura) {
    setText(doc, GRAY_900);
    doc.setFont('helvetica', 'normal');
    doc.text('N° Factura:', boxX + 3, y + 16);
    setText(doc, SAVANTE_BLUE);
    doc.setFont('helvetica', 'bold');
    doc.text(pago.numero_factura, boxX + 67, y + 16, { align: 'right' });
  }

  setText(doc, GRAY_900);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Fecha:', boxX + 3, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.text(fmtDate(pago.fecha_pago), boxX + 67, y + 22, { align: 'right' });

  y += 30;

  // CLIENTE
  setDraw(doc, GRAY_300);
  setFill(doc, GRAY_50);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 26, 1.5, 1.5, 'FD');

  setText(doc, SAVANTE_BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('RECIBÍ DE', margin + 3, y + 4.5);

  setDraw(doc, GRAY_300);
  doc.line(margin, y + 6, margin + contentW, y + 6);

  setText(doc, GRAY_900);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let yc = y + 11;
  doc.setFont('helvetica', 'bold');
  doc.text(pago.cliente_nombre || '', margin + 3, yc);
  yc += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, GRAY_700);
  if (pago.cliente_ruc_cedula) {
    const ruc = pago.cliente_dv ? `${pago.cliente_ruc_cedula} DV: ${pago.cliente_dv}` : pago.cliente_ruc_cedula;
    doc.text(`RUC/Cédula: ${ruc}`, margin + 3, yc); yc += 3.5;
  }
  if (pago.cliente_telefono) doc.text(`Tel: ${pago.cliente_telefono}`, margin + 3, yc), yc += 3.5;
  if (pago.cliente_direccion) {
    const lines = doc.splitTextToSize(`Dirección: ${pago.cliente_direccion}`, contentW - 6);
    doc.text(lines.slice(0, 1), margin + 3, yc);
  }

  y += 30;

  // CONCEPTO Y MONTO (caja destacada)
  setDraw(doc, SAVANTE_BLUE);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentW, 24);

  setFill(doc, SAVANTE_BLUE_LIGHT);
  doc.rect(margin, y, contentW, 6, 'F');
  setText(doc, SAVANTE_BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CONCEPTO DEL PAGO', margin + 3, y + 4);

  setText(doc, GRAY_900);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let yi = y + 11;

  const concepto = pago.concepto || `Pago aplicado a ${pago.documento_referencia || ''}`;
  doc.text(concepto, margin + 3, yi);
  yi += 4;

  if (pago.documento_referencia) {
    doc.setFontSize(8);
    setText(doc, GRAY_700);
    doc.text(`Documento: ${pago.tipo_documento === 'ORDEN' ? 'Orden de Taller' : 'Visita en Sitio'} ${pago.documento_referencia}`, margin + 3, yi);
    yi += 3.5;
  }

  if (pago.referencia) {
    doc.setFontSize(8);
    setText(doc, GRAY_700);
    doc.text(`Referencia: ${pago.referencia}`, margin + 3, yi);
  }

  y += 28;

  // MONTO GRANDE
  setFill(doc, SAVANTE_BLUE);
  doc.rect(margin, y, contentW, 16, 'F');

  setText(doc, [255, 255, 255]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('MONTO RECIBIDO', margin + 5, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Método: ${pago.metodo_pago}`, margin + 5, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(fmtMoney(pago.monto), margin + contentW - 5, y + 11, { align: 'right' });

  y += 20;

  // ==============================================
  // SELLO "PAGADO" (decorativo, esquina derecha)
  // ==============================================
  if (pago.estado !== 'ANULADO') {
    const SELLO_VERDE = [21, 128, 61];
    setDraw(doc, SELLO_VERDE);
    setText(doc, SELLO_VERDE);

    const selloW = 50;
    const selloH = 22;
    const selloX = pageW - margin - selloW - 5;
    const selloY = y - 5;

    // Doble borde para efecto de sello clásico
    doc.setLineWidth(1.2);
    doc.roundedRect(selloX, selloY, selloW, selloH, 2, 2, 'S');
    doc.setLineWidth(0.4);
    doc.roundedRect(selloX + 1.8, selloY + 1.8, selloW - 3.6, selloH - 3.6, 1.5, 1.5, 'S');

    // Texto PAGADO
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('PAGADO', selloX + selloW / 2, selloY + selloH / 2 + 1, { align: 'center' });

    // Fecha debajo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(fmtDate(pago.fecha_pago), selloX + selloW / 2, selloY + selloH - 3, { align: 'center' });

    doc.setLineWidth(0.2);

    y += 22;
  }

  // Monto en letras
  setText(doc, GRAY_700);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  const enLetras = numeroALetras(pago.monto);
  const enLetrasLines = doc.splitTextToSize(`SON: ${enLetras}`, contentW);
  doc.text(enLetrasLines, margin, y);
  y += enLetrasLines.length * 3.5 + 4;

  // Notas
  if (pago.notas) {
    setText(doc, GRAY_700);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Notas:', margin, y);
    y += 3.5;
    const lines = doc.splitTextToSize(pago.notas, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 3.5 + 4;
  }

  // Estado anulado
  if (pago.estado === 'ANULADO') {
    setFill(doc, [254, 242, 242]);
    setDraw(doc, [220, 38, 38]);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentW, 12, 'FD');
    setText(doc, [220, 38, 38]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('** PAGO ANULADO **', pageW / 2, y + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(pago.motivo_anulacion || '', pageW / 2, y + 9, { align: 'center' });
    y += 16;
  }

  // FIRMAS
  y = pageH - 50;
  const firmaW = (contentW - 20) / 2;
  setDraw(doc, GRAY_500);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + firmaW, y);
  doc.line(margin + firmaW + 20, y, margin + 2 * firmaW + 20, y);

  setText(doc, GRAY_700);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Recibe (Empresa)', margin + firmaW / 2, y + 4, { align: 'center' });
  doc.text('Entrega (Cliente)', margin + firmaW + 20 + firmaW / 2, y + 4, { align: 'center' });

  if (pago.registrado_por_nombre) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(pago.registrado_por_nombre, margin + firmaW / 2, y + 8, { align: 'center' });
  }

  // PIE DE PÁGINA
  setFontSize_pie(doc, pageW, pageH, margin, empresa, pago);

  const nombreArchivo = `Recibo-${pago.numero_recibo}.pdf`;
  if (opciones.soloBlob) {
    return { blob: doc.output('blob'), nombre: nombreArchivo };
  }
  doc.save(nombreArchivo);
  return { blob: doc.output('blob'), nombre: nombreArchivo };
}

function setFontSize_pie(doc, pageW, pageH, margin, empresa, pago) {
  doc.setFontSize(7);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.setFont('helvetica', 'normal');
  if (empresa?.pie_pagina_pdf) {
    const pieLines = doc.splitTextToSize(empresa.pie_pagina_pdf, pageW - 2 * margin);
    doc.text(pieLines, pageW / 2, pageH - 8, { align: 'center' });
  }
  doc.text(pago.numero_recibo || '', margin, pageH - 4);
  doc.text('Recibo de pago', pageW - margin, pageH - 4, { align: 'right' });
}
