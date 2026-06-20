import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SAVANTE_BLUE = [0, 49, 83];
const SAVANTE_BLUE_LIGHT = [219, 234, 245];
const GRAY_900 = [17, 24, 39];
const GRAY_700 = [55, 65, 81];
const GRAY_500 = [107, 114, 128];
const GRAY_300 = [209, 213, 219];
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
 * Genera y descarga el PDF del estado de cuenta del cliente.
 */
export function generarEstadoCuenta({ cliente, items, pagos, empresa = {}, desde, hasta, soloPendientes }) {
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
    } catch (err) {}
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

  // Caja del documento
  const boxX = pageW - margin - 70;
  setDraw(doc, SAVANTE_BLUE);
  doc.setLineWidth(0.5);
  doc.rect(boxX, y, 70, 22);

  setFill(doc, SAVANTE_BLUE);
  doc.rect(boxX, y, 70, 6, 'F');
  setText(doc, [255, 255, 255]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTADO DE CUENTA', boxX + 35, y + 4, { align: 'center' });

  setText(doc, GRAY_900);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Generado:', boxX + 3, y + 11);
  doc.setFont('helvetica', 'bold');
  doc.text(fmtDate(new Date()), boxX + 67, y + 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text('Período:', boxX + 3, y + 16);
  doc.setFont('helvetica', 'bold');
  const periodo = (desde || hasta)
    ? `${desde ? fmtDate(desde) : '...'} a ${hasta ? fmtDate(hasta) : '...'}`
    : 'Todos los registros';
  doc.text(periodo, boxX + 67, y + 16, { align: 'right' });

  y += 26;

  // CLIENTE
  setDraw(doc, GRAY_300);
  setFill(doc, GRAY_50);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 26, 1.5, 1.5, 'FD');

  setText(doc, SAVANTE_BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CLIENTE', margin + 3, y + 4.5);
  setDraw(doc, GRAY_300);
  doc.line(margin, y + 6, margin + contentW, y + 6);

  setText(doc, GRAY_900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(cliente.nombre || '', margin + 3, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, GRAY_700);
  let yc = y + 16;
  doc.text(`Código: ${cliente.numero_cliente || '-'}`, margin + 3, yc);
  if (cliente.ruc_cedula) {
    const ruc = cliente.dv ? `${cliente.ruc_cedula} DV: ${cliente.dv}` : cliente.ruc_cedula;
    doc.text(`RUC/Cédula: ${ruc}`, margin + 60, yc);
  }
  yc += 3.5;
  if (cliente.telefono) doc.text(`Tel: ${cliente.telefono}`, margin + 3, yc);
  if (cliente.correo) doc.text(`Correo: ${cliente.correo}`, margin + 60, yc);
  yc += 3.5;
  if (cliente.direccion) {
    const lines = doc.splitTextToSize(`Dirección: ${cliente.direccion}`, contentW - 6);
    doc.text(lines.slice(0, 1), margin + 3, yc);
  }

  y += 30;

  // RESUMEN
  const totalDoc = items.reduce((s, i) => s + Number(i.monto_total || 0), 0);
  const totalPagado = items.reduce((s, i) => s + Number(i.monto_pagado || 0), 0);
  const totalSaldo = items.reduce((s, i) => s + Number(i.saldo || 0), 0);

  // 3 cajas de resumen
  const resumenW = (contentW - 8) / 3;

  // Total facturado
  setFill(doc, GRAY_50);
  setDraw(doc, GRAY_300);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, resumenW, 18, 1.5, 1.5, 'FD');
  setText(doc, GRAY_500);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL FACTURADO', margin + resumenW / 2, y + 5, { align: 'center' });
  setText(doc, GRAY_900);
  doc.setFontSize(13);
  doc.text(fmtMoney(totalDoc), margin + resumenW / 2, y + 13, { align: 'center' });

  // Total pagado
  setFill(doc, [236, 253, 245]);
  setDraw(doc, [167, 243, 208]);
  doc.roundedRect(margin + resumenW + 4, y, resumenW, 18, 1.5, 1.5, 'FD');
  setText(doc, [5, 150, 105]);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL PAGADO', margin + resumenW + 4 + resumenW / 2, y + 5, { align: 'center' });
  doc.setFontSize(13);
  doc.text(fmtMoney(totalPagado), margin + resumenW + 4 + resumenW / 2, y + 13, { align: 'center' });

  // Saldo pendiente
  setFill(doc, [254, 242, 242]);
  setDraw(doc, [254, 202, 202]);
  doc.roundedRect(margin + 2 * (resumenW + 4), y, resumenW, 18, 1.5, 1.5, 'FD');
  setText(doc, [220, 38, 38]);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('SALDO PENDIENTE', margin + 2 * (resumenW + 4) + resumenW / 2, y + 5, { align: 'center' });
  doc.setFontSize(13);
  doc.text(fmtMoney(totalSaldo), margin + 2 * (resumenW + 4) + resumenW / 2, y + 13, { align: 'center' });

  y += 22;

  // TABLA DE DOCUMENTOS
  if (items.length > 0) {
    setText(doc, SAVANTE_BLUE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(soloPendientes ? 'DOCUMENTOS PENDIENTES' : 'DOCUMENTOS', margin, y);
    y += 4;

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
      },
      head: [['Tipo', 'Documento', 'Fecha', 'Descripción', 'Total', 'Pagado', 'Saldo']],
      body: items.map(i => [
        i.tipo_documento === 'ORDEN' ? 'Orden' : 'Visita',
        i.numero_documento,
        fmtDate(i.fecha_documento),
        (i.descripcion || '').substring(0, 60),
        fmtMoney(i.monto_total),
        fmtMoney(i.monto_pagado),
        fmtMoney(i.saldo),
      ]),
      didParseCell: (data) => {
        if (data.section === 'body') {
          data.cell.styles.lineWidth = { top: 0, right: 0, bottom: 0.1, left: 0 };
          data.cell.styles.lineColor = GRAY_300;
          if (data.column.index === 6) {
            const saldo = items[data.row.index]?.saldo || 0;
            if (Number(saldo) > 0) {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            }
          }
          if (data.column.index === 5) {
            data.cell.styles.textColor = [5, 150, 105];
          }
        }
      },
      foot: [['', '', '', 'TOTALES:', fmtMoney(totalDoc), fmtMoney(totalPagado), fmtMoney(totalSaldo)]],
      footStyles: {
        fillColor: GRAY_50,
        textColor: GRAY_900,
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 22, halign: 'left' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // TABLA DE PAGOS
  if (pagos && pagos.length > 0) {
    if (y > pageH - 50) { doc.addPage(); y = margin; }

    setText(doc, SAVANTE_BLUE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('HISTORIAL DE PAGOS', margin, y);
    y += 4;

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
      },
      head: [['Fecha', 'Recibo', 'Factura', 'Documento', 'Método', 'Monto']],
      body: pagos.map(p => [
        fmtDate(p.fecha_pago),
        p.numero_recibo,
        p.numero_factura || '—',
        p.documento_referencia || '-',
        p.metodo_pago,
        fmtMoney(p.monto),
      ]),
      didParseCell: (data) => {
        if (data.section === 'body') {
          data.cell.styles.lineWidth = { top: 0, right: 0, bottom: 0.1, left: 0 };
          data.cell.styles.lineColor = GRAY_300;
          if (data.column.index === 5) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [5, 150, 105];
          }
        }
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 25 },
        5: { cellWidth: 25, halign: 'right' },
      },
      margin: { left: margin, right: margin },
    });
  }

  // PIE DE PÁGINA
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
    doc.text(`Estado de cuenta · ${cliente.nombre || ''}`, margin, pageH - 4);
  }

  doc.save(`EstadoCuenta-${cliente.numero_cliente || cliente.nombre}.pdf`);
}
