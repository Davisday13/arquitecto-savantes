import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TIPOS_VISITA_LABEL, ESTADOS_VISITA_LABEL } from '../lib/constants';

// =========================================================
// COLORES (mismos del presupuesto para consistencia)
// =========================================================
const SAVANTE_BLUE       = [0, 49, 83];        // #003153
const SAVANTE_BLUE_LIGHT = [219, 234, 245];
const SAVANTE_GOLD       = [201, 162, 39];     // acento dorado
const GRAY_900 = [17, 24, 39];
const GRAY_700 = [55, 65, 81];
const GRAY_500 = [107, 114, 128];
const GRAY_400 = [156, 163, 175];
const GRAY_300 = [209, 213, 219];
const GRAY_50  = [249, 250, 251];

// =========================================================
// HELPERS
// =========================================================
const fmtDate = (d) => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-PA', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const fmtTime = (t) => {
  if (!t) return '—';
  return String(t).slice(0, 5);
};

const fmtMoney = (n) => {
  const v = Number(n || 0);
  return 'USD ' + v.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Calcula duración entre hora_inicio y hora_fin
const calcularDuracion = (inicio, fin) => {
  if (!inicio || !fin) return '—';
  try {
    const [hI, mI] = inicio.split(':').map(Number);
    const [hF, mF] = fin.split(':').map(Number);
    const minutos = (hF * 60 + mF) - (hI * 60 + mI);
    if (minutos <= 0) return '—';
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  } catch { return '—'; }
};

const setFill = (doc, c) => doc.setFillColor(c[0], c[1], c[2]);
const setText = (doc, c) => doc.setTextColor(c[0], c[1], c[2]);
const setDraw = (doc, c) => doc.setDrawColor(c[0], c[1], c[2]);

// Pill del estado
function estadoVisitaPill(doc, x, y, estado) {
  const map = {
    PROGRAMADA:  { bg: SAVANTE_BLUE_LIGHT, fg: SAVANTE_BLUE },
    EN_RUTA:     { bg: [254, 243, 199], fg: [146, 64, 14] },
    EN_SITIO:    { bg: [220, 252, 231], fg: [21, 128, 61] },
    COMPLETADA:  { bg: [220, 252, 231], fg: [21, 128, 61] },
    CANCELADA:   { bg: [254, 226, 226], fg: [185, 28, 28] },
    REPROGRAMADA:{ bg: GRAY_300, fg: GRAY_700 },
  };
  const e = map[estado] || { bg: GRAY_300, fg: GRAY_700 };
  const label = (ESTADOS_VISITA_LABEL[estado] || estado || '').toUpperCase();
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const tw = doc.getTextWidth(label) + 6;
  setFill(doc, e.bg);
  doc.roundedRect(x, y - 3.5, tw, 5, 2, 2, 'F');
  setText(doc, e.fg);
  doc.text(label, x + 3, y);
}

// Caja de información tipo "etiqueta + valor"
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

// Sección de texto con título sutil (en lugar de banda azul completa)
function drawTextSection(doc, x, y, w, title, content, pageH) {
  if (!content) return y;

  // Verificar espacio para al menos el título + 2 líneas
  if (y + 12 > pageH - 25) {
    doc.addPage();
    y = 12;
  }

  // Título en gris pequeño con underline azul corto
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setText(doc, GRAY_500);
  doc.text(title.toUpperCase(), x, y);

  setDraw(doc, SAVANTE_BLUE);
  doc.setLineWidth(0.6);
  doc.line(x, y + 1.5, x + 25, y + 1.5);
  doc.setLineWidth(0.2);

  y += 5;

  // Contenido
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  setText(doc, GRAY_900);
  const lines = doc.splitTextToSize(content, w);

  // Salto de página si necesita
  if (y + lines.length * 4 > pageH - 25) {
    // Si solo cabe una parte, partimos
    const lineasQueCaben = Math.floor((pageH - 25 - y) / 4);
    if (lineasQueCaben > 0) {
      doc.text(lines.slice(0, lineasQueCaben), x, y);
      doc.addPage();
      y = 12;
      doc.text(lines.slice(lineasQueCaben), x, y);
      y += (lines.length - lineasQueCaben) * 4 + 3;
    } else {
      doc.addPage();
      y = 12;
      doc.text(lines, x, y);
      y += lines.length * 4 + 3;
    }
  } else {
    doc.text(lines, x, y);
    y += lines.length * 4 + 3;
  }

  return y;
}

// =========================================================
// FUNCIÓN PRINCIPAL
// =========================================================
export function generarPDFVisita(visita, empresa = {}, opciones = {}) {
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

  // Logo
  if (empresa?.logo_url) {
    try {
      doc.addImage(empresa.logo_url, 'PNG', margin, headerY, 22, 22);
    } catch (e) { /* ignorar */ }
  }

  // Datos empresa
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

  // Título REPORTE DE VISITA + número
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  setText(doc, SAVANTE_BLUE);
  doc.text('REPORTE DE VISITA', pageW - margin, headerY + 8, { align: 'right' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  setText(doc, GRAY_700);
  doc.text(visita.numero_visita || '', pageW - margin, headerY + 15, { align: 'right' });

  // Línea decorativa azul + dorado
  y = headerY + headerH + 2;
  setDraw(doc, SAVANTE_BLUE);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);

  setDraw(doc, SAVANTE_GOLD);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 1.2, margin + 30, y + 1.2);

  doc.setLineWidth(0.2);
  y += 6;

  // ============================================================
  // BANDA DE METADATOS: fecha, tipo, técnico, estado
  // ============================================================
  setFill(doc, GRAY_50);
  doc.rect(margin, y, contentW, 12, 'F');
  setDraw(doc, GRAY_300);
  doc.rect(margin, y, contentW, 12, 'S');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  setText(doc, GRAY_500);
  doc.text('FECHA', margin + 3, y + 4);
  doc.text('TIPO', margin + 45, y + 4);
  doc.text('TÉCNICO', margin + 95, y + 4);
  doc.text('ESTADO', margin + 150, y + 4);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setText(doc, GRAY_900);
  doc.text(fmtDate(visita.fecha_visita), margin + 3, y + 9.5);
  doc.text(TIPOS_VISITA_LABEL[visita.tipo_visita] || visita.tipo_visita || '—', margin + 45, y + 9.5);
  doc.text(visita.tecnico_nombre || '—', margin + 95, y + 9.5);
  estadoVisitaPill(doc, margin + 150, y + 9, visita.estado);

  y += 16;

  // ============================================================
  // CLIENTE Y EQUIPO/DETALLES (2 cajas lado a lado)
  // ============================================================
  const colW = (contentW - 4) / 2;

  const clienteRows = [
    ['Nombre', visita.cliente_nombre],
    visita.numero_cliente ? ['Código', visita.numero_cliente] : null,
    visita.cliente_telefono ? ['Teléfono', visita.cliente_telefono] : null,
    visita.cliente_correo ? ['Correo', visita.cliente_correo] : null,
    (visita.direccion_visita || visita.cliente_direccion)
      ? ['Dirección', visita.direccion_visita || visita.cliente_direccion]
      : null,
  ].filter(Boolean);

  const clienteBoxH = Math.max(30, 9 + clienteRows.length * 8);
  drawInfoBox(doc, margin, y, colW, clienteBoxH, 'CLIENTE', clienteRows);

  // Caja derecha: equipo si tiene, sino horario
  const tieneEquipo = !!(visita.tipo_equipo || visita.numero_serie || visita.marca);
  let detalleRows;
  let detalleTitle;

  if (tieneEquipo) {
    detalleTitle = 'EQUIPO ATENDIDO';
    detalleRows = [
      visita.tipo_equipo ? ['Tipo', visita.tipo_equipo] : null,
      (visita.marca || visita.modelo)
        ? ['Marca/Modelo', `${visita.marca || ''} ${visita.modelo || ''}`.trim()]
        : null,
      visita.numero_serie ? ['N° Serie', visita.numero_serie] : null,
      ['Hora inicio', fmtTime(visita.hora_inicio)],
      ['Hora fin', fmtTime(visita.hora_fin)],
      ['Duración', calcularDuracion(visita.hora_inicio, visita.hora_fin)],
    ].filter(Boolean);
  } else {
    detalleTitle = 'DETALLES DEL SERVICIO';
    detalleRows = [
      ['Hora inicio', fmtTime(visita.hora_inicio)],
      ['Hora fin', fmtTime(visita.hora_fin)],
      ['Duración', calcularDuracion(visita.hora_inicio, visita.hora_fin)],
    ];
  }

  drawInfoBox(doc, margin + colW + 4, y, colW, clienteBoxH, detalleTitle, detalleRows);

  y += clienteBoxH + 4;

  // ============================================================
  // SECCIONES DE TEXTO
  // ============================================================
  if (visita.motivo) {
    y = drawTextSection(doc, margin, y, contentW, 'Motivo / Solicitud', visita.motivo, pageH);
  }

  if (visita.trabajo_realizado) {
    y = drawTextSection(doc, margin, y, contentW, 'Trabajo realizado', visita.trabajo_realizado, pageH);
  }

  if (visita.observaciones) {
    y = drawTextSection(doc, margin, y, contentW, 'Observaciones', visita.observaciones, pageH);
  }

  // ============================================================
  // CHECKLIST
  // ============================================================
  const checklist = Array.isArray(visita.checklist) ? visita.checklist : [];
  if (checklist.length > 0) {
    if (y + 15 + checklist.length * 5 > pageH - 25) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setText(doc, GRAY_500);
    doc.text('CHECKLIST DE REVISIÓN', margin, y);
    setDraw(doc, SAVANTE_BLUE);
    doc.setLineWidth(0.6);
    doc.line(margin, y + 1.5, margin + 35, y + 1.5);
    doc.setLineWidth(0.2);
    y += 5;

    doc.setFontSize(9);
    checklist.forEach((it) => {
      if (y + 5 > pageH - 25) {
        doc.addPage();
        y = margin;
      }
      const completado = !!it.ok;

      // Cuadradito
      setDraw(doc, completado ? [21, 128, 61] : GRAY_400);
      setFill(doc, completado ? [220, 252, 231] : [255, 255, 255]);
      doc.roundedRect(margin, y - 3, 3.5, 3.5, 0.5, 0.5, 'FD');

      if (completado) {
        // Check verde
        setDraw(doc, [21, 128, 61]);
        doc.setLineWidth(0.6);
        doc.line(margin + 0.7, y - 1.3, margin + 1.5, y - 0.5);
        doc.line(margin + 1.5, y - 0.5, margin + 2.8, y - 2.3);
        doc.setLineWidth(0.2);
      }

      // Texto del item
      doc.setFont('helvetica', 'normal');
      setText(doc, completado ? GRAY_900 : GRAY_500);
      const textoItem = it.item || it.texto || '';
      doc.text(textoItem, margin + 6, y);

      // Si tiene nota, mostrarla en gris pequeño
      if (it.nota && it.nota.trim()) {
        const xNota = margin + 6 + doc.getTextWidth(textoItem) + 3;
        doc.setFontSize(7);
        setText(doc, GRAY_500);
        doc.setFont('helvetica', 'italic');
        doc.text(`— ${it.nota}`, xNota, y);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
      }

      y += 5;
    });
    y += 2;
  }

  // ============================================================
  // FOTOS (en grid 2x2)
  // ============================================================
  const fotos = Array.isArray(visita.fotos) ? visita.fotos.filter(Boolean) : [];
  if (fotos.length > 0) {
    if (y + 10 > pageH - 80) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setText(doc, GRAY_500);
    doc.text(`FOTOS DEL SERVICIO (${fotos.length})`, margin, y);
    setDraw(doc, SAVANTE_BLUE);
    doc.setLineWidth(0.6);
    doc.line(margin, y + 1.5, margin + 40, y + 1.5);
    doc.setLineWidth(0.2);
    y += 5;

    // Grid 2x2 — cada foto 80mm x 55mm
    const fotoW = 80;
    const fotoH = 55;
    const gap = 4;

    for (let i = 0; i < fotos.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2) % 2; // 2 filas por página

      // Si empieza fila nueva fuera del rango, salto de página
      if (i > 0 && col === 0 && row === 0) {
        // Estamos volviendo a la primera fila → nueva página
        doc.addPage();
        y = margin;
      }

      const x = margin + col * (fotoW + gap);
      const yFoto = y + row * (fotoH + gap);

      try {
        doc.addImage(fotos[i], 'JPEG', x, yFoto, fotoW, fotoH);
      } catch (e) {
        // Marcador si falla la imagen
        setFill(doc, GRAY_50);
        doc.rect(x, yFoto, fotoW, fotoH, 'F');
        setText(doc, GRAY_500);
        doc.setFontSize(8);
        doc.text('(imagen no disponible)', x + fotoW / 2, yFoto + fotoH / 2, { align: 'center' });
      }

      // Borde sutil
      setDraw(doc, GRAY_300);
      doc.rect(x, yFoto, fotoW, fotoH, 'S');

      // Si terminamos esta fila, avanzamos y
      if (col === 1 || i === fotos.length - 1) {
        // Avanzar y al final de la última fila visible
        if (i === fotos.length - 1) {
          y += (row + 1) * (fotoH + gap);
        }
      }
    }
    // Si solo hay 1 o 3 fotos, ajustar y final
    const filasUsadas = Math.ceil(fotos.length / 2);
    const filasEnPaginaActual = ((filasUsadas - 1) % 2) + 1;
    y += filasEnPaginaActual * (fotoH + gap);
    y += 2;
  }

  // ============================================================
  // TOTALES (solo si la visita tiene costo)
  // ============================================================
  const tieneCosto = Number(visita.costo_visita || 0) > 0;
  if (tieneCosto) {
    if (y + 30 > pageH - 25) {
      doc.addPage();
      y = margin;
    }

    const subVisita = Number(visita.costo_visita || 0);
    const pctVisita = Number(visita.costo_itbms_pct || 0);
    const incluyeITBMS = visita.precios_incluyen_itbms !== false;

    let subSinITBMS, itbmsVisita, totalVisita;
    if (incluyeITBMS) {
      subSinITBMS = subVisita / (1 + pctVisita / 100);
      itbmsVisita = subVisita - subSinITBMS;
      totalVisita = subVisita;
    } else {
      subSinITBMS = subVisita;
      itbmsVisita = subVisita * pctVisita / 100;
      totalVisita = subVisita + itbmsVisita;
    }

    // Caja totales a la derecha
    const totX = margin + contentW - 80;
    const totW = 80;

    setFill(doc, GRAY_50);
    doc.rect(totX, y, totW, 26, 'F');
    setDraw(doc, GRAY_300);
    doc.rect(totX, y, totW, 26, 'S');

    doc.setFontSize(9);
    setText(doc, GRAY_700);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', totX + 3, y + 6);
    doc.text(fmtMoney(subSinITBMS), totX + totW - 3, y + 6, { align: 'right' });

    doc.text(`ITBMS (${pctVisita}%):`, totX + 3, y + 12);
    doc.text(fmtMoney(itbmsVisita), totX + totW - 3, y + 12, { align: 'right' });

    setDraw(doc, GRAY_300);
    doc.line(totX + 3, y + 14, totX + totW - 3, y + 14);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    setText(doc, SAVANTE_BLUE);
    doc.text('TOTAL:', totX + 3, y + 22);
    doc.text(fmtMoney(totalVisita), totX + totW - 3, y + 22, { align: 'right' });

    y += 30;
  }

  // ============================================================
  // FIRMA DEL CLIENTE (con espacio adecuado)
  // ============================================================
  if (visita.firma_cliente) {
    if (y + 45 > pageH - 25) {
      doc.addPage();
      y = margin;
    }
    y += 10; // espacio arriba

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setText(doc, GRAY_500);
    doc.text('FIRMA DEL CLIENTE', margin, y);
    y += 4;

    try {
      doc.addImage(visita.firma_cliente, 'PNG', margin, y, 60, 25);
    } catch (e) { /* skip */ }

    setDraw(doc, GRAY_500);
    doc.line(margin, y + 27, margin + 70, y + 27);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    setText(doc, GRAY_700);
    if (visita.firma_cliente_nombre) {
      doc.text(visita.firma_cliente_nombre, margin, y + 31);
    }
    doc.setFontSize(7);
    setText(doc, GRAY_500);
    doc.text(`Recibido conforme · ${fmtDate(visita.fecha_visita)}`, margin, y + 35);
    y += 40;
  }

  // ============================================================
  // TÉRMINOS Y CONDICIONES (banda azul claro)
  // ============================================================
  if (empresa?.terminos_visita) {
    if (y + 25 > pageH - 25) {
      doc.addPage();
      y = margin;
    }

    setFill(doc, SAVANTE_BLUE_LIGHT);
    doc.rect(margin, y, contentW, 6, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setText(doc, SAVANTE_BLUE);
    doc.text('TÉRMINOS Y CONDICIONES', margin + 3, y + 4);
    y += 8;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    setText(doc, GRAY_700);
    const terminos = empresa.terminos_visita.replace(/{DIAS}/g, empresa.dias_garantia || 30);
    const condLines = doc.splitTextToSize(terminos, contentW);
    doc.text(condLines, margin, y);
    y += condLines.length * 3.5 + 3;
  }

  // ============================================================
  // FOOTER unificado en cada página
  // ============================================================
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Línea sutil arriba del footer
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

    doc.text(visita.numero_visita || '', margin, pageH - 4);
  }

  // ============================================================
  // SALIDA
  // ============================================================
  const nombreArchivo = `Visita-${visita.numero_visita || 'reporte'}.pdf`;
  if (opciones.soloBlob) {
    return { blob: doc.output('blob'), nombre: nombreArchivo };
  }
  doc.save(nombreArchivo);
  return { blob: doc.output('blob'), nombre: nombreArchivo };
}
