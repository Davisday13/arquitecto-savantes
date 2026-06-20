/**
 * Helpers para envío de mensajes WhatsApp Click-to-Chat
 *
 * No requiere API ni costos — abre WhatsApp Web/App con el mensaje pre-llenado.
 * El usuario le da "Enviar" manualmente.
 */

export function limpiarTelefono(numero, codigoPais = '507') {
  if (!numero) return '';
  const soloDigitos = String(numero).replace(/\D/g, '');
  if (soloDigitos.startsWith(codigoPais)) return soloDigitos;
  return codigoPais + soloDigitos;
}

export function aplicarVariables(plantilla, vars = {}) {
  if (!plantilla) return '';
  let resultado = plantilla;
  Object.entries(vars).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    resultado = resultado.replace(regex, value || '');
  });
  return resultado;
}

export function generarUrlWhatsApp(telefono, mensaje, codigoPais = '507') {
  const tel = limpiarTelefono(telefono, codigoPais);
  const txt = encodeURIComponent(mensaje || '');
  return `https://wa.me/${tel}?text=${txt}`;
}

export function abrirWhatsApp(telefono, mensaje, codigoPais = '507') {
  const url = generarUrlWhatsApp(telefono, mensaje, codigoPais);
  window.open(url, '_blank', 'noopener,noreferrer');
}

export const PLANTILLAS_DEFAULT = {
  COTIZACION: `Hola {cliente},

Te envío la cotización {numero} del proyecto por un total de {total}.

Quedo atento para cualquier consulta.

Saludos,
{empresa}`,

  PROYECTO: `Hola {cliente},

Te confirmo la apertura del proyecto {numero}.

Saludos,
{empresa}`,

  PAGO: `Hola {cliente},

Te confirmo el recibo de pago {numero} por {total}.

¡Gracias por tu pago!
{empresa}`,
};

export function getPlantilla(tipo, empresa) {
  const map = {
    COTIZACION: empresa?.whatsapp_plantilla_cotizacion,
    PROYECTO: empresa?.whatsapp_plantilla_proyecto,
    PAGO: empresa?.whatsapp_plantilla_pago,
  };
  return map[tipo] || PLANTILLAS_DEFAULT[tipo] || '';
}

export function formatearTelefonoUI(telefono) {
  if (!telefono) return '';
  const limpio = String(telefono).replace(/\D/g, '');
  let local = limpio;
  if (limpio.startsWith('507')) local = limpio.slice(3);
  if (local.length === 8) return `${local.slice(0, 4)}-${local.slice(4)}`;
  if (local.length === 7) return `${local.slice(0, 3)}-${local.slice(3)}`;
  return telefono;
}
