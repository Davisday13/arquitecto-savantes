export const formatDate = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-PA', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

export const formatDateTime = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es-PA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
};

export const formatCurrency = (amount, currency = 'PAB') => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(num);
};

export const getInitials = (nombre) => {
  if (!nombre) return '??';
  const parts = nombre.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return nombre.slice(0, 2).toUpperCase();
};

export const truncate = (text, max = 50) => {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '\u2026' : text;
};

export const cn = (...classes) => classes.filter(Boolean).join(' ');
