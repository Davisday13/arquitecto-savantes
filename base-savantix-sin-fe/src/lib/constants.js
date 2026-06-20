// =====================================================================
// Constantes del sistema de soporte técnico
// =====================================================================

export const ROLES = {
  ROOT: 'ROOT',
  ADMIN: 'ADMIN',
  RECEPCIONISTA: 'RECEPCIONISTA',
  TECNICO: 'TECNICO',
  CLIENTE: 'CLIENTE',
};

export const ROLES_LABEL = {
  ROOT: 'Root',
  ADMIN: 'Administrador',
  RECEPCIONISTA: 'Recepcionista',
  TECNICO: 'Técnico',
  CLIENTE: 'Cliente',
};

// Estados de las órdenes de taller (en orden de flujo)
export const ESTADOS_ORDEN = {
  RECIBIDO: 'RECIBIDO',
  DIAGNOSTICO: 'DIAGNOSTICO',
  ESPERANDO_REPUESTO: 'ESPERANDO_REPUESTO',
  REPARACION: 'REPARACION',
  PRUEBAS: 'PRUEBAS',
  LISTO: 'LISTO',
  ENTREGADO: 'ENTREGADO',
  CANCELADO: 'CANCELADO',
};

export const ESTADOS_ORDEN_FLUJO = [
  'RECIBIDO',
  'DIAGNOSTICO',
  'ESPERANDO_REPUESTO',
  'REPARACION',
  'PRUEBAS',
  'LISTO',
  'ENTREGADO',
];

export const ESTADOS_ORDEN_LABEL = {
  RECIBIDO: 'Recibido',
  DIAGNOSTICO: 'En Diagnóstico',
  ESPERANDO_REPUESTO: 'Esperando Repuesto',
  REPARACION: 'En Reparación',
  PRUEBAS: 'En Pruebas',
  LISTO: 'Listo para Entrega',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

export const ESTADOS_ORDEN_COLOR = {
  RECIBIDO: 'bg-gray-100 text-gray-700 border-gray-300',
  DIAGNOSTICO: 'bg-blue-100 text-blue-700 border-blue-300',
  ESPERANDO_REPUESTO: 'bg-amber-100 text-amber-700 border-amber-300',
  REPARACION: 'bg-purple-100 text-purple-700 border-purple-300',
  PRUEBAS: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  LISTO: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  ENTREGADO: 'bg-green-100 text-green-700 border-green-300',
  CANCELADO: 'bg-red-100 text-red-700 border-red-300',
};

// Tipos de cliente
export const TIPOS_CLIENTE = {
  EMPRESA: 'EMPRESA',
  PERSONAL: 'PERSONAL',
};

export const TIPOS_CLIENTE_LABEL = {
  EMPRESA: 'Empresa',
  PERSONAL: 'Personal',
};

// Tipos de equipo (extensible)
export const TIPOS_EQUIPO = [
  'CCTV',
  'IMPRESORA',
  'COPIADORA',
  'COMPUTADORA',
  'LAPTOP',
  'SERVIDOR',
  'RED',
  'TELEFONIA',
  'PROYECTOR',
  'OTRO',
];

// Tipos de visita en sitio
export const TIPOS_VISITA = {
  REVISION: 'REVISION',
  ASISTENCIA: 'ASISTENCIA',
  INSTALACION: 'INSTALACION',
  MANTENIMIENTO: 'MANTENIMIENTO',
};

export const TIPOS_VISITA_LABEL = {
  REVISION: 'Revisión',
  ASISTENCIA: 'Asistencia Técnica',
  INSTALACION: 'Instalación',
  MANTENIMIENTO: 'Mantenimiento',
};

// Estados de visita
export const ESTADOS_VISITA = {
  PROGRAMADA: 'PROGRAMADA',
  EN_CURSO: 'EN_CURSO',
  COMPLETADA: 'COMPLETADA',
  CANCELADA: 'CANCELADA',
};

export const ESTADOS_VISITA_LABEL = {
  PROGRAMADA: 'Programada',
  EN_CURSO: 'En Curso',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
};

export const ESTADOS_VISITA_COLOR = {
  PROGRAMADA: 'bg-blue-100 text-blue-700 border-blue-300',
  EN_CURSO: 'bg-amber-100 text-amber-700 border-amber-300',
  COMPLETADA: 'bg-green-100 text-green-700 border-green-300',
  CANCELADA: 'bg-red-100 text-red-700 border-red-300',
};

// Permisos por defecto según rol
export const PERMISOS_POR_ROL = {
  ROOT: {
    dashboard: true, clientes: true, equipos: true, ordenes: true,
    visitas: true, pagos: true, catalogo: true, usuarios: true, permisos: true, reportes: true,
    auditoria: true, configuracion: true, correos: true,
    presupuestos: true, plantillas: true, metas: true,
  },
  ADMIN: {
    dashboard: true, clientes: true, equipos: true, ordenes: true,
    visitas: true, pagos: true, catalogo: true, usuarios: true, permisos: false, reportes: true,
    auditoria: true, configuracion: true, correos: true,
    presupuestos: true, plantillas: true, metas: true,
  },
  RECEPCIONISTA: {
    dashboard: true, clientes: true, equipos: true, ordenes: true,
    visitas: true, pagos: true, catalogo: true, usuarios: false, permisos: false, reportes: true,
    auditoria: false, configuracion: false, correos: true,
    presupuestos: true, plantillas: false, metas: false,
  },
  TECNICO: {
    dashboard: true, clientes: true, equipos: true, ordenes: true,
    visitas: true, pagos: false, catalogo: true, usuarios: false, permisos: false, reportes: false,
    auditoria: false, configuracion: false, correos: false,
    presupuestos: true, plantillas: false, metas: false,
  },
  CLIENTE: {
    dashboard: true, clientes: false, equipos: true, ordenes: true,
    visitas: true, pagos: false, catalogo: false, usuarios: false, permisos: false, reportes: false,
    auditoria: false, configuracion: false, correos: false,
    presupuestos: false, plantillas: false, metas: false,
  },
};

// Unidades de medida
export const UNIDADES = ['UND', 'M', 'KG', 'L', 'CAJA', 'PAQUETE', 'HORA'];

// Métodos de pago
export const METODOS_PAGO = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'YAPPY', 'CHEQUE', 'OTRO'];

// Tasas de ITBMS válidas en Panamá
export const TASAS_ITBMS = [
  { value: 0,  label: 'Exento (0%)' },
  { value: 7,  label: 'Estándar (7%)' },
  { value: 10, label: 'Bebidas/Hospedaje (10%)' },
  { value: 15, label: 'Tabaco (15%)' },
];

// Categorías predeterminadas para el catálogo
// (también se aceptan categorías personalizadas escritas a mano)
export const CATEGORIAS_REPUESTO = [
  'Impresoras',
  'Copiadoras',
  'CCTV',
  'Computadoras',
  'Cartuchos / Tóners',
  'Cables',
  'Accesorios',
  'Consumibles',
  'Herramientas',
  'Otros',
];

// Estados de stock con colores
export const ESTADO_STOCK_LABEL = {
  OK:       'Disponible',
  BAJO:     'Stock bajo',
  AGOTADO:  'Agotado',
  INACTIVO: 'Inactivo',
};
export const ESTADO_STOCK_COLOR = {
  OK:       'bg-emerald-100 text-emerald-700 border-emerald-300',
  BAJO:     'bg-amber-100 text-amber-700 border-amber-300',
  AGOTADO:  'bg-red-100 text-red-700 border-red-300',
  INACTIVO: 'bg-gray-100 text-gray-600 border-gray-300',
};

// Helper: si los precios incluyen ITBMS, desglosa
//   subtotal = total / (1 + tasa)
//   itbms    = total - subtotal
// Si no, suma el ITBMS:
//   subtotal = total
//   itbms    = total * tasa
export function desglosarItbms(monto, pct, incluido = true) {
  const m = Number(monto) || 0;
  const tasa = (Number(pct) || 0) / 100;
  if (incluido) {
    const subtotal = Math.round((m / (1 + tasa)) * 100) / 100;
    const itbms = Math.round((m - subtotal) * 100) / 100;
    return { subtotal, itbms, total: m };
  } else {
    const itbms = Math.round((m * tasa) * 100) / 100;
    return { subtotal: m, itbms, total: m + itbms };
  }
}

export const ESTADO_PAGO_LABEL = {
  PAGADO: 'Pagado',
  PARCIAL: 'Parcial',
  PENDIENTE: 'Pendiente',
  SIN_COSTO: 'Sin costo',
};

export const ESTADO_PAGO_COLOR = {
  PAGADO:    'bg-emerald-100 text-emerald-700 border-emerald-300',
  PARCIAL:   'bg-amber-100 text-amber-700 border-amber-300',
  PENDIENTE: 'bg-red-100 text-red-700 border-red-300',
  SIN_COSTO: 'bg-gray-100 text-gray-600 border-gray-300',
};
