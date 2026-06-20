// Formatear fecha YYYY-MM-DD
export const formatDate = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-PA', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// Formatear fecha y hora
export const formatDateTime = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es-PA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
};

// Formatear moneda (USD por defecto, ajustable)
export const formatCurrency = (amount, currency = 'USD') => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(num);
};

// Generar iniciales desde un nombre
export const getInitials = (nombre) => {
  if (!nombre) return '??';
  const parts = nombre.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return nombre.slice(0, 2).toUpperCase();
};

// Truncar texto
export const truncate = (text, max = 50) => {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
};

// Combinar clases tailwind condicionales
export const cn = (...classes) => classes.filter(Boolean).join(' ');
