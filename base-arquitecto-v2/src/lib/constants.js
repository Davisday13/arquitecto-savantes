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

export const FASES_OBRA_DEFAULT = [
  { fase: 'PRELIMINAR', peso: 5, sub_etapas: ['Permisos', 'Desmonte y limpieza', 'Caseta', 'Medidor temporal', 'Baño', 'Conexión a agua'] },
  { fase: 'MARCACIÓN', peso: 5, sub_etapas: ['Trazado y nivelación', 'Movimiento de tierra', 'Replanteo'] },
  { fase: 'CIMIENTOS / FUNDACIÓN', peso: 15, sub_etapas: ['Trazado fundación', 'Excavación fundación', 'Armado acero', 'Colocación acero', 'Vaciado concreto', 'Muros de cimentación'] },
  { fase: 'LOSAS', peso: 10, sub_etapas: ['Trazado pisos', 'Formaletas pisos', 'Instalaciones plomería', 'Instalaciones eléctricas', 'Vaciado de concreto'] },
  { fase: 'MUROS Y COLUMNAS', peso: 20, sub_etapas: ['Trazado paredes', 'Formaletas columnas', 'Formaletas vigas', 'Armado acero', 'Colocación acero', 'Vaciado concreto', 'Bloqueo paredes', 'Instalaciones eléctricas', 'Instalaciones plomería', 'Repello y mochetas'] },
  { fase: 'CUBIERTA', peso: 10, sub_etapas: ['Estructura de cubierta', 'Instalación aislantes', 'Instalación de cubierta', 'Instalación eléctrica', 'Refuerzos de techo'] },
  { fase: 'PUERTAS Y VENTANAS', peso: 5, sub_etapas: ['Instalación de puertas', 'Instalación de ventanas'] },
  { fase: 'ACABADOS E INSTALACIONES', peso: 15, sub_etapas: ['Inst. Sist. Eléctrico', 'Inst. Sist. Plomería', 'Inst. Artefactos sanitarios', 'Inst. Revestimientos', 'Inst. Mobiliario', 'Aplicación de bases y pinturas', 'Inst. Cielorasos'] },
  { fase: 'TRABAJOS FINALES', peso: 5, sub_etapas: ['Demolición inst. temporales', 'Limpieza interior', 'Limpieza exterior', 'Labores de jardinería', 'Cercas y muros externos'] },
  { fase: 'ENTREGA', peso: 10, sub_etapas: ['Permisos de ocupación', 'Conexiones eléctricas (NATURGY)', 'Conexiones sanitarias (Municipio)', 'Conexiones acueducto (Municipio)', 'Entrega conforme'] },
];

export const PRESUPUESTO_CATEGORIAS = [
  { id: 'MATERIALES', label: 'Materiales' },
  { id: 'MANO_OBRA', label: 'Mano de obra' },
  { id: 'RENTABILIDAD', label: 'Rentabilidad' },
  { id: 'GARANTIA', label: 'Garantía' },
  { id: 'HERRAMIENTAS', label: 'Herramientas' },
];

export function getPermisos(rol, permisosExtra) {
  const base = PERMISOS_POR_ROL[rol] || PERMISOS_POR_ROL.CLIENTE;
  if (!permisosExtra) return base;
  return { ...base, ...permisosExtra };
}

export function tienePermiso(permisos, modulo, nivel) {
  return (permisos?.[modulo] || 0) >= nivel;
}
