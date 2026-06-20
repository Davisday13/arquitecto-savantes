/**
 * Helpers para envío de mensajes WhatsApp Click-to-Chat
 *
 * No requiere API ni costos — abre WhatsApp Web/App con el mensaje pre-llenado.
 * El usuario le da "Enviar" manualmente.
 */

/**
 * Limpia un número de teléfono dejando solo dígitos
 * y agrega el código de país si no lo tiene.
 *
 * Ejemplos:
 *   "6992-1184"        + "507" → "50769921184"
 *   "+507 6992 1184"   + "507" → "50769921184"
 *   "(507) 6992-1184"  + "507" → "50769921184"
 *   "50769921184"      + "507" → "50769921184" (ya tiene código)
 */
export function limpiarTelefono(numero, codigoPais = '507') {
  if (!numero) return '';
  // Quitar todo lo que no sea dígito
  const soloDigitos = String(numero).replace(/\D/g, '');
  // Si ya empieza con el código de país, devolver tal cual
  if (soloDigitos.startsWith(codigoPais)) return soloDigitos;
  // Si no, agregar el código de país
  return codigoPais + soloDigitos;
}

/**
 * Reemplaza variables en una plantilla.
 * Variables soportadas:
 *   {cliente}, {numero}, {empresa}, {total}, {link}
 */
export function aplicarVariables(plantilla, vars = {}) {
  if (!plantilla) return '';
  let resultado = plantilla;
  Object.entries(vars).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    resultado = resultado.replace(regex, value || '');
  });
  return resultado;
}

/**
 * Genera la URL de WhatsApp Click-to-Chat.
 *
 * @param {string} telefono - Número del destinatario (con o sin código país)
 * @param {string} mensaje - Texto del mensaje
 * @param {string} codigoPais - Código de país por defecto (Panamá: 507)
 * @returns {string} URL https://wa.me/...
 */
export function generarUrlWhatsApp(telefono, mensaje, codigoPais = '507') {
  const tel = limpiarTelefono(telefono, codigoPais);
  const txt = encodeURIComponent(mensaje || '');
  return `https://wa.me/${tel}?text=${txt}`;
}

/**
 * Abre WhatsApp con el mensaje pre-llenado.
 * En desktop abre WhatsApp Web, en móvil abre la app nativa.
 */
export function abrirWhatsApp(telefono, mensaje, codigoPais = '507') {
  const url = generarUrlWhatsApp(telefono, mensaje, codigoPais);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Plantillas por defecto si la empresa no tiene custom configuradas.
 */
export const PLANTILLAS_DEFAULT = {
  ORDEN: `Hola {cliente},

Tu orden de servicio {numero} ha sido procesada.

Total: {total}

Saludos,
{empresa}`,

  VISITA: `Hola {cliente},

Te envío el reporte de la visita técnica {numero} realizada.

Saludos,
{empresa}`,

  RECIBO: `Hola {cliente},

Te confirmo el recibo de pago {numero} por {total}.

¡Gracias por tu pago!
{empresa}`,

  PRESUPUESTO: `Hola {cliente},

Te envío el presupuesto {numero} por un total de {total}.

Quedo atento para cualquier consulta.

Saludos,
{empresa}`,
};

/**
 * Devuelve la plantilla que corresponde según el tipo, priorizando
 * la versión custom de la empresa, sino la default.
 */
export function getPlantilla(tipo, empresa) {
  const map = {
    ORDEN: empresa?.whatsapp_plantilla_orden,
    VISITA: empresa?.whatsapp_plantilla_visita,
    RECIBO: empresa?.whatsapp_plantilla_recibo,
    PRESUPUESTO: empresa?.whatsapp_plantilla_presupuesto,
  };
  return map[tipo] || PLANTILLAS_DEFAULT[tipo] || '';
}

/**
 * Formato bonito del número para mostrar en UI: "6992-1184"
 */
export function formatearTelefonoUI(telefono) {
  if (!telefono) return '';
  const limpio = String(telefono).replace(/\D/g, '');
  // Sin código país, formato local Panamá
  let local = limpio;
  if (limpio.startsWith('507')) local = limpio.slice(3);
  // Formato 6992-1184
  if (local.length === 8) return `${local.slice(0, 4)}-${local.slice(4)}`;
  if (local.length === 7) return `${local.slice(0, 3)}-${local.slice(3)}`;
  return telefono;
}
