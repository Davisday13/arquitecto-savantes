export function limpiarTelefono(numero, codigoPais = '507') {
  if (!numero) return '';
  const soloDigitos = String(numero).replace(/\D/g, '');
  if (soloDigitos.startsWith(codigoPais)) return soloDigitos;
  return codigoPais + soloDigitos;
}

export function aplicarVariables(plantilla, vars = {}) {
  if (!plantilla) return '';
  let r = plantilla;
  Object.entries(vars).forEach(([k, v]) => { r = r.replace(new RegExp(`\\{${k}\\}`, 'g'), v || ''); });
  return r;
}

export function generarUrlWhatsApp(telefono, mensaje, codigoPais = '507') {
  return `https://wa.me/${limpiarTelefono(telefono, codigoPais)}?text=${encodeURIComponent(mensaje || '')}`;
}

export const PLANTILLAS_DEFAULT = {
  COTIZACION: `Hola {cliente},\n\nTe envío la cotización del proyecto {numero} por un total de {total}.\n\nSaludos,\n{empresa}`,
  PAGO: `Hola {cliente},\n\nTe confirmo el recibo de pago {numero} por {total}.\n\n¡Gracias!\n{empresa}`,
};

export function getPlantilla(tipo, empresa) {
  const map = { COTIZACION: empresa?.whatsapp_plantilla_cotizacion, PAGO: empresa?.whatsapp_plantilla_pago };
  return map[tipo] || PLANTILLAS_DEFAULT[tipo] || '';
}
