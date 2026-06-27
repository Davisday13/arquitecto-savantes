export const ROLES = {
  ROOT: 'ROOT',
  ADMIN: 'ADMIN',
  ARQUITECTO: 'ARQUITECTO',
  ASISTENTE: 'ASISTENTE',
  CLIENTE: 'CLIENTE',
};

export const ROLES_LABEL = {
  ROOT: 'Root',
  ADMIN: 'Administrador',
  ARQUITECTO: 'Arquitecto',
  ASISTENTE: 'Asistente',
  CLIENTE: 'Cliente',
};

export const ESTADOS_PROYECTO = {
  COTIZACION: 'COTIZACION',
  EN_CURSO: 'EN_CURSO',
  COMPLETADO: 'COMPLETADO',
  CANCELADO: 'CANCELADO',
};

export const ESTADOS_PROYECTO_LABEL = {
  COTIZACION: 'Cotización',
  EN_CURSO: 'En curso',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado',
};

export const ESTADOS_PROYECTO_COLOR = {
  COTIZACION: 'bg-blue-100 text-blue-700 border-blue-300',
  EN_CURSO: 'bg-amber-100 text-amber-700 border-amber-300',
  COMPLETADO: 'bg-green-100 text-green-700 border-green-300',
  CANCELADO: 'bg-red-100 text-red-700 border-red-300',
};

export const ESTADOS_SUB_ETAPA = {
  PENDIENTE: 'PENDIENTE',
  EN_CURSO: 'EN_CURSO',
  COMPLETADA: 'COMPLETADA',
};

export const ESTADOS_SUB_ETAPA_LABEL = {
  PENDIENTE: 'Pendiente',
  EN_CURSO: 'En curso',
  COMPLETADA: 'Completada',
};

export const ESTADOS_SUB_ETAPA_COLOR = {
  PENDIENTE: 'bg-gray-100 text-gray-700 border-gray-300',
  EN_CURSO: 'bg-blue-100 text-blue-700 border-blue-300',
  COMPLETADA: 'bg-green-100 text-green-700 border-green-300',
};

export const ESTADOS_COTIZACION = {
  BORRADOR: 'BORRADOR',
  ENVIADO: 'ENVIADO',
  APROBADO: 'APROBADO',
  RECHAZADO: 'RECHAZADO',
  VENCIDO: 'VENCIDO',
  CONVERTIDO: 'CONVERTIDO',
  CANCELADO: 'CANCELADO',
};

export const ESTADOS_COTIZACION_LABEL = {
  BORRADOR: 'Borrador',
  ENVIADO: 'Enviado',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  VENCIDO: 'Vencido',
  CONVERTIDO: 'Convertido',
  CANCELADO: 'Cancelado',
};

export const ESTADOS_COTIZACION_COLOR = {
  BORRADOR: 'bg-gray-100 text-gray-700 border-gray-300',
  ENVIADO: 'bg-blue-100 text-blue-700 border-blue-300',
  APROBADO: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  RECHAZADO: 'bg-red-100 text-red-700 border-red-300',
  VENCIDO: 'bg-amber-100 text-amber-700 border-amber-300',
  CONVERTIDO: 'bg-purple-100 text-purple-700 border-purple-300',
  CANCELADO: 'bg-gray-200 text-gray-600 border-gray-400',
};

export const TIPOS_CLIENTE = {
  EMPRESA: 'EMPRESA',
  PERSONAL: 'PERSONAL',
};

export const TIPOS_CLIENTE_LABEL = {
  EMPRESA: 'Empresa',
  PERSONAL: 'Personal',
};

export const CATEGORIAS_GASTO = [
  'MATERIALES',
  'MANO_OBRA',
  'EQUIPO',
  'TRANSPORTE',
  'PERMISOS',
  'ALQUILER',
  'SERVICIOS_PROFESIONALES',
  'OTROS',
];

export const CATEGORIAS_GASTO_LABEL = {
  MATERIALES: 'Materiales',
  MANO_OBRA: 'Mano de obra',
  EQUIPO: 'Equipo / Maquinaria',
  TRANSPORTE: 'Transporte',
  PERMISOS: 'Permisos / Licencias',
  ALQUILER: 'Alquiler',
  SERVICIOS_PROFESIONALES: 'Servicios profesionales',
  OTROS: 'Otros',
};

export const TIPOS_GASTO = {
  GENERAL: 'GENERAL',
  POR_ETAPA: 'POR_ETAPA',
};

export const TIPOS_GASTO_LABEL = {
  GENERAL: 'General (oficina)',
  POR_ETAPA: 'Por etapa del proyecto',
};

export const CATEGORIAS_INVENTARIO = [
  'MATERIAL_CONSTRUCCION',
  'HERRAMIENTAS',
  'ACABADOS',
  'ELECTRICIDAD',
  'PLOMERIA',
  'PINTURA',
  'SEGURIDAD',
  'OFICINA',
  'OTROS',
];

export const CATEGORIAS_INVENTARIO_LABEL = {
  MATERIAL_CONSTRUCCION: 'Material de construcción',
  HERRAMIENTAS: 'Herramientas',
  ACABADOS: 'Acabados',
  ELECTRICIDAD: 'Electricidad',
  PLOMERIA: 'Plomería',
  PINTURA: 'Pintura',
  SEGURIDAD: 'Seguridad',
  OFICINA: 'Oficina',
  OTROS: 'Otros',
};

export const UNIDADES_MEDIDA = ['UND', 'M', 'M2', 'M3', 'KG', 'L', 'GL', 'BOLSA', 'CAJA', 'PAQUETE', 'ROLLO', 'PLIEGO', 'HORA', 'DIA', 'M2'];

export const FASES_CONSTRUCCION = [
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

export const FASES_LABEL = Object.fromEntries(FASES_CONSTRUCCION.map(f => [f.fase, f.fase]));

export const PRESUPUESTO_CATEGORIAS = [
  { id: 'MATERIALES', label: 'Materiales' },
  { id: 'MANO_OBRA', label: 'Mano de obra' },
  { id: 'RENTABILIDAD', label: 'Rentabilidad' },
  { id: 'GARANTIA', label: 'Garantía' },
  { id: 'HERRAMIENTAS', label: 'Herramientas' },
];

export const METODOS_PAGO = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'YAPPY', 'CHEQUE', 'OTRO'];

export const TASAS_ITBMS = [
  { value: 0,  label: 'Exento (0%)' },
  { value: 7,  label: 'Estándar (7%)' },
  { value: 10, label: 'Bebidas/Hospedaje (10%)' },
  { value: 15, label: 'Tabaco (15%)' },
];

export const PERMISOS_POR_ROL = {
  ROOT: {
    dashboard: true, clientes: true, proyectos: true, inventario: true,
    cotizaciones: true, pagos: true, gastos: true, estadocuenta: true,
    usuarios: true, permisos: true, reportes: true,
    auditoria: true, configuracion: true, correos: true,
  },
  ADMIN: {
    dashboard: true, clientes: true, proyectos: true, inventario: true,
    cotizaciones: true, pagos: true, gastos: true, estadocuenta: true,
    usuarios: true, permisos: false, reportes: true,
    auditoria: true, configuracion: true, correos: true,
  },
  ARQUITECTO: {
    dashboard: true, clientes: true, proyectos: true, inventario: true,
    cotizaciones: true, pagos: true, gastos: true, estadocuenta: true,
    usuarios: false, permisos: false, reportes: true,
    auditoria: false, configuracion: false, correos: true,
  },
  ASISTENTE: {
    dashboard: true, clientes: true, proyectos: true, inventario: true,
    cotizaciones: true, pagos: true, gastos: true, estadocuenta: true,
    usuarios: false, permisos: false, reportes: false,
    auditoria: false, configuracion: false, correos: true,
  },
  CLIENTE: {
    dashboard: true, clientes: false, proyectos: true, inventario: false,
    cotizaciones: false, pagos: false, gastos: false, estadocuenta: true,
    usuarios: false, permisos: false, reportes: false,
    auditoria: false, configuracion: false, correos: false,
  },
};

export const ESTADO_PAGO_LABEL = {
  CONFIRMADO: 'Confirmado',
  ANULADO: 'Anulado',
};

export const ESTADO_PAGO_COLOR = {
  CONFIRMADO: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  ANULADO: 'bg-red-100 text-red-700 border-red-300',
};
