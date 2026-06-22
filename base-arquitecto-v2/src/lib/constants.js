export const ROLES = ['ROOT','ADMIN','ARQUITECTO','ASISTENTE','CLIENTE'];

export const ESTADOS_PROYECTO = ['COTIZACION','EN_CURSO','PAUSADO','FINALIZADO','CANCELADO'];
export const TIPOS_ETAPA = ['DISENO','OBRA'];
export const METODOS_PAGO = ['EFECTIVO','TRANSFERENCIA','TARJETA','CHEQUE','OTRO'];
export const CATEGORIAS_GASTO = ['MATERIALES','HERRAMIENTAS','TRANSPORTE','SERVICIOS','ALIMENTACION','OTROS'];
export const CATEGORIAS_INVENTARIO = ['MATERIAL','HERRAMIENTA','INSUMO','EQUIPO'];
export const TIPOS_MOVIMIENTO = ['ENTRADA','SALIDA','AJUSTE'];

export const PERMISOS_POR_ROL = {
  ROOT: { dashboard:7, proyectos:7, cotizaciones:7, pagos:7, gastos:7, inventario:7, estado_cuenta:7, clientes:7, usuarios:7, permisos:7, auditoria:7, reportes:7, notificaciones:7, configuracion:7, correos:7 },
  ADMIN: { dashboard:7, proyectos:7, cotizaciones:7, pagos:7, gastos:7, inventario:7, estado_cuenta:7, clientes:7, usuarios:7, permisos:5, auditoria:5, reportes:7, notificaciones:5, configuracion:7, correos:5 },
  ARQUITECTO: { dashboard:7, proyectos:7, cotizaciones:7, pagos:7, gastos:7, inventario:7, estado_cuenta:7, clientes:7, usuarios:0, permisos:0, auditoria:1, reportes:5, notificaciones:3, configuracion:1, correos:3 },
  ASISTENTE: { dashboard:5, proyectos:5, cotizaciones:5, pagos:5, gastos:5, inventario:5, estado_cuenta:3, clientes:5, usuarios:0, permisos:0, auditoria:0, reportes:0, notificaciones:3, configuracion:0, correos:3 },
  CLIENTE: { dashboard:3, proyectos:3, cotizaciones:0, pagos:1, gastos:0, inventario:0, estado_cuenta:3, clientes:1, usuarios:0, permisos:0, auditoria:0, reportes:0, notificaciones:1, configuracion:0, correos:0 },
};

export const SUBETAPAS_DISENO_DEFAULT = [
  { nombre: 'Conceptualización', peso_pct: 30 },
  { nombre: 'Desarrollo de planos', peso_pct: 50 },
  { nombre: 'Aprobación', peso_pct: 20 },
];

export function getPermisos(rol, permisosExtra) {
  const base = PERMISOS_POR_ROL[rol] || PERMISOS_POR_ROL.CLIENTE;
  if (!permisosExtra) return base;
  return { ...base, ...permisosExtra };
}

export function tienePermiso(permisos, modulo, nivel) {
  return (permisos?.[modulo] || 0) >= nivel;
}
