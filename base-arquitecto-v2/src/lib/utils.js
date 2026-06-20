export function formatCurrency(val) {
  const n = Number(val || 0);
  return `B/. ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-PA', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-PA');
}

export function generarNumero(prefix, serie) {
  const s = String(serie || 1).padStart(4, '0');
  return `${prefix}-${s}`;
}

export const ESTADOS_PROYECTO = ['COTIZACION','EN_CURSO','PAUSADO','FINALIZADO','CANCELADO'];
export const TIPOS_ETAPA = ['DISENO','OBRA'];
