-- =========================================================
-- SISTEMA DE CONTROL PARA ARQUITECTOS - Schema consolidado
-- Gestión de proyectos, etapas, presupuestos, gastos e inventario
-- =========================================================
-- Correr este archivo COMPLETO en el SQL Editor de Supabase
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- USUARIOS (enlaza con auth.users de Supabase Auth)
-- =========================================================
DROP TABLE IF EXISTS public.usuarios CASCADE;
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  email_login TEXT UNIQUE NOT NULL,
  nombre_completo TEXT NOT NULL,
  telefono TEXT,
  rol TEXT NOT NULL CHECK (rol IN ('ROOT','ADMIN','ARQUITECTO','ASISTENTE','CLIENTE')) DEFAULT 'ARQUITECTO',
  id_cliente_asociado UUID,
  activo BOOLEAN DEFAULT true,
  permisos JSONB DEFAULT '{
    "dashboard": true,
    "clientes": false,
    "proyectos": false,
    "inventario": false,
    "cotizaciones": false,
    "pagos": false,
    "gastos": false,
    "estadocuenta": false,
    "usuarios": false,
    "permisos": false,
    "reportes": false,
    "auditoria": false,
    "configuracion": false
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- CLIENTES (empresas y personas)
-- =========================================================
DROP TABLE IF EXISTS public.clientes CASCADE;
CREATE TABLE public.clientes (
  id_cliente UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_cliente TEXT NOT NULL UNIQUE,
  tipo_cliente TEXT NOT NULL CHECK (tipo_cliente IN ('EMPRESA','PERSONAL')) DEFAULT 'EMPRESA',
  nombre TEXT NOT NULL,
  ruc_cedula TEXT,
  contacto_nombre TEXT,
  telefono TEXT,
  correo TEXT,
  direccion TEXT,
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL
);

ALTER TABLE public.usuarios
  ADD CONSTRAINT fk_usuario_cliente
  FOREIGN KEY (id_cliente_asociado) REFERENCES public.clientes(id_cliente) ON DELETE SET NULL;

-- =========================================================
-- PROYECTOS (corazón del sistema)
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS proyecto_codigo_seq START 1000;

DROP TABLE IF EXISTS public.proyectos CASCADE;
CREATE TABLE public.proyectos (
  id_proyecto UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE DEFAULT ('PRO-' || nextval('proyecto_codigo_seq')),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  id_cliente UUID NOT NULL REFERENCES public.clientes(id_cliente) ON DELETE RESTRICT,
  direccion_obra TEXT,
  fecha_inicio DATE,
  fecha_estimada_entrega DATE,
  fecha_real_entrega DATE,
  estado TEXT NOT NULL CHECK (estado IN (
    'COTIZACION','EN_CURSO','COMPLETADO','CANCELADO'
  )) DEFAULT 'COTIZACION',
  presupuesto_total DECIMAL(12,2) DEFAULT 0,
  total_pagado DECIMAL(12,2) DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL
);

-- =========================================================
-- ETAPAS (fases del proyecto, ej: Planos, Cimentación, Estructura)
-- =========================================================
DROP TABLE IF EXISTS public.etapas CASCADE;
CREATE TABLE public.etapas (
  id_etapa UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_proyecto UUID NOT NULL REFERENCES public.proyectos(id_proyecto) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  descripcion TEXT,
  peso_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 0,
  presupuesto DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- SUB-ETAPAS (actividades dentro de cada etapa)
-- =========================================================
DROP TABLE IF EXISTS public.sub_etapas CASCADE;
CREATE TABLE public.sub_etapas (
  id_sub_etapa UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_etapa UUID NOT NULL REFERENCES public.etapas(id_etapa) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  descripcion TEXT,
  peso_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 0,
  presupuesto DECIMAL(12,2) DEFAULT 0,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado TEXT NOT NULL CHECK (estado IN (
    'PENDIENTE','EN_CURSO','COMPLETADA'
  )) DEFAULT 'PENDIENTE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- AVANCE DE SUB-ETAPA (historial de % avance)
-- =========================================================
DROP TABLE IF EXISTS public.avance_sub_etapa CASCADE;
CREATE TABLE public.avance_sub_etapa (
  id_avance UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sub_etapa UUID NOT NULL REFERENCES public.sub_etapas(id_sub_etapa) ON DELETE CASCADE,
  porcentaje_avance DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (porcentaje_avance >= 0 AND porcentaje_avance <= 100),
  fecha_actualizacion DATE NOT NULL DEFAULT CURRENT_DATE,
  notas TEXT,
  created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- COTIZACIONES (adaptado del módulo de presupuestos original)
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS cotizacion_numero_seq START 1000;

DROP TABLE IF EXISTS public.cotizaciones CASCADE;
CREATE TABLE public.cotizaciones (
  id_cotizacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_cotizacion TEXT NOT NULL UNIQUE DEFAULT ('COT-' || nextval('cotizacion_numero_seq')),
  id_cliente UUID NOT NULL REFERENCES public.clientes(id_cliente) ON DELETE RESTRICT,
  id_proyecto UUID REFERENCES public.proyectos(id_proyecto) ON DELETE SET NULL,
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_validez DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '15 days')::date,
  estado TEXT NOT NULL CHECK (estado IN (
    'BORRADOR','ENVIADO','APROBADO','RECHAZADO','VENCIDO','CONVERTIDO','CANCELADO'
  )) DEFAULT 'BORRADOR',
  asunto TEXT,
  precios_incluyen_itbms BOOLEAN DEFAULT true,
  subtotal_sin_itbms DECIMAL(12,2) DEFAULT 0,
  total_itbms DECIMAL(12,2) DEFAULT 0,
  descuento_tipo TEXT CHECK (descuento_tipo IN ('PORCENTAJE','MONTO')),
  descuento_valor DECIMAL(10,2) DEFAULT 0,
  descuento_monto_calculado DECIMAL(10,2) DEFAULT 0,
  total_general DECIMAL(12,2) DEFAULT 0,
  observaciones TEXT,
  condiciones TEXT,
  notas_internas TEXT,
  requiere_firma BOOLEAN DEFAULT false,
  firma_cliente TEXT,
  aprobado_por_nombre TEXT,
  aprobado_por_correo TEXT,
  fecha_aprobacion TIMESTAMPTZ,
  id_proyecto_generado UUID,
  motivo_rechazo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL
);

-- Items de cotización
DROP TABLE IF EXISTS public.cotizacion_items CASCADE;
CREATE TABLE public.cotizacion_items (
  id_item UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cotizacion UUID NOT NULL REFERENCES public.cotizaciones(id_cotizacion) ON DELETE CASCADE,
  id_etapa UUID REFERENCES public.etapas(id_etapa) ON DELETE SET NULL,
  id_sub_etapa UUID REFERENCES public.sub_etapas(id_sub_etapa) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('PRODUCTO','SERVICIO')) DEFAULT 'SERVICIO',
  id_inventario UUID,
  sku TEXT,
  descripcion TEXT NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  itbms_pct DECIMAL(5,2) NOT NULL DEFAULT 7,
  subtotal DECIMAL(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auditoría de cotizaciones
DROP TABLE IF EXISTS public.cotizacion_auditoria CASCADE;
CREATE TABLE public.cotizacion_auditoria (
  id_auditoria UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cotizacion UUID NOT NULL REFERENCES public.cotizaciones(id_cotizacion) ON DELETE CASCADE,
  id_usuario UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  accion TEXT NOT NULL,
  detalle TEXT,
  cambios JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- PAGOS (adaptado para pagos por proyecto / sub-etapa)
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS pago_recibo_seq START 1000;

DROP TABLE IF EXISTS public.pagos CASCADE;
CREATE TABLE public.pagos (
  id_pago UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_recibo TEXT NOT NULL UNIQUE DEFAULT ('REC-' || nextval('pago_recibo_seq')),
  id_cliente UUID NOT NULL REFERENCES public.clientes(id_cliente) ON DELETE RESTRICT,
  id_proyecto UUID REFERENCES public.proyectos(id_proyecto) ON DELETE SET NULL,
  id_sub_etapa UUID REFERENCES public.sub_etapas(id_sub_etapa) ON DELETE SET NULL,
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  monto DECIMAL(12,2) NOT NULL CHECK (monto > 0),
  metodo_pago TEXT NOT NULL DEFAULT 'EFECTIVO',
  referencia TEXT,
  concepto TEXT,
  estado TEXT NOT NULL CHECK (estado IN ('CONFIRMADO','ANULADO')) DEFAULT 'CONFIRMADO',
  motivo_anulacion TEXT,
  anulado_at TIMESTAMPTZ,
  anulado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL
);

-- =========================================================
-- GASTOS (generales de oficina o por etapa de proyecto)
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS gasto_codigo_seq START 1000;

DROP TABLE IF EXISTS public.gastos CASCADE;
CREATE TABLE public.gastos (
  id_gasto UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE DEFAULT ('GAS-' || nextval('gasto_codigo_seq')),
  id_proyecto UUID REFERENCES public.proyectos(id_proyecto) ON DELETE SET NULL,
  id_etapa UUID REFERENCES public.etapas(id_etapa) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('GENERAL','POR_ETAPA')) DEFAULT 'GENERAL',
  descripcion TEXT NOT NULL,
  monto DECIMAL(12,2) NOT NULL CHECK (monto > 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  categoria TEXT DEFAULT 'OTROS',
  proveedor TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL
);

-- =========================================================
-- INVENTARIO (materiales y suministros para obras)
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS inventario_codigo_seq START 1000;

DROP TABLE IF EXISTS public.inventario CASCADE;
CREATE TABLE public.inventario (
  id_item UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE DEFAULT ('INV-' || nextval('inventario_codigo_seq')),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT DEFAULT 'OTROS',
  unidad_medida TEXT NOT NULL DEFAULT 'UND',
  cantidad_actual DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (cantidad_actual >= 0),
  precio_unitario DECIMAL(10,2) DEFAULT 0,
  stock_minimo DECIMAL(12,2) DEFAULT 0,
  ubicacion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL
);

-- =========================================================
-- CONSUMO DE INVENTARIO (materiales usados por sub-etapa)
-- =========================================================
DROP TABLE IF EXISTS public.consumo_inventario CASCADE;
CREATE TABLE public.consumo_inventario (
  id_consumo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_item UUID NOT NULL REFERENCES public.inventario(id_item) ON DELETE RESTRICT,
  id_sub_etapa UUID REFERENCES public.sub_etapas(id_sub_etapa) ON DELETE SET NULL,
  cantidad DECIMAL(12,2) NOT NULL CHECK (cantidad > 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL
);

-- =========================================================
-- AUDITORÍA (cambios sensibles en cualquier tabla)
-- =========================================================
DROP TABLE IF EXISTS public.auditoria CASCADE;
CREATE TABLE public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla TEXT NOT NULL,
  registro_id UUID NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('CREAR','MODIFICAR','ELIMINAR')),
  usuario_id UUID,
  usuario_nombre TEXT,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- NOTIFICACIONES (cola: app + email + whatsapp)
-- =========================================================
DROP TABLE IF EXISTS public.notificaciones CASCADE;
CREATE TABLE public.notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
  destinatario_email TEXT,
  destinatario_telefono TEXT,
  canal TEXT NOT NULL CHECK (canal IN ('APP','EMAIL','WHATSAPP','SMS')) DEFAULT 'APP',
  asunto TEXT,
  mensaje TEXT NOT NULL,
  entidad_tipo TEXT,
  entidad_id UUID,
  estado TEXT NOT NULL CHECK (estado IN ('PENDIENTE','ENVIADA','FALLIDA','LEIDA')) DEFAULT 'PENDIENTE',
  enviada_at TIMESTAMPTZ,
  leida_at TIMESTAMPTZ,
  error_mensaje TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- CONFIGURACIÓN DE EMPRESA
-- =========================================================
DROP TABLE IF EXISTS public.configuracion_empresa CASCADE;
CREATE TABLE public.configuracion_empresa (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nombre_empresa TEXT NOT NULL DEFAULT 'Mi Empresa',
  ruc TEXT,
  telefono TEXT,
  correo TEXT,
  direccion TEXT,
  logo_url TEXT,
  pie_pagina_pdf TEXT,
  moneda_simbolo TEXT DEFAULT 'B/.',
  moneda_codigo TEXT DEFAULT 'PAB',
  precios_incluyen_itbms BOOLEAN DEFAULT false,
  itbms_default_pct DECIMAL(5,2) DEFAULT 7,
  terminos_cotizacion TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.configuracion_empresa (id, nombre_empresa, moneda_simbolo, moneda_codigo, precios_incluyen_itbms, terminos_cotizacion)
VALUES (1, 'Estudio de Arquitectura', 'B/.', 'PAB', false, 'Cotización válida por 15 días. Los precios no incluyen ITBMS.')
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- VISTAS
-- =========================================================

-- Proyectos completa con cliente
DROP VIEW IF EXISTS public.v_proyectos_completa CASCADE;
CREATE VIEW public.v_proyectos_completa AS
SELECT
  p.*,
  c.numero_cliente, c.nombre AS cliente_nombre, c.tipo_cliente, c.telefono AS cliente_telefono, c.correo AS cliente_correo,
  u.nombre_completo AS creado_por_nombre,
  -- Totales calculados desde etapas (roll-up)
  COALESCE((
    SELECT SUM(se.presupuesto) FROM public.sub_etapas se
    JOIN public.etapas e ON e.id_etapa = se.id_etapa
    WHERE e.id_proyecto = p.id_proyecto
  ), 0) AS total_sub_etapas,
  -- Avance promedio ponderado
  COALESCE((
    SELECT AVG(ase.porcentaje_avance) FROM public.avance_sub_etapa ase
    JOIN public.sub_etapas se ON se.id_sub_etapa = ase.id_sub_etapa
    JOIN public.etapas e ON e.id_etapa = se.id_etapa
    WHERE e.id_proyecto = p.id_proyecto
    AND ase.id_avance = (
      SELECT MAX(a2.id_avance) FROM public.avance_sub_etapa a2
      WHERE a2.id_sub_etapa = ase.id_sub_etapa
    )
  ), 0) AS porcentaje_avance_general
FROM public.proyectos p
LEFT JOIN public.clientes c ON c.id_cliente = p.id_cliente
LEFT JOIN public.usuarios u ON u.id = p.created_by;

-- Cotizaciones completa
DROP VIEW IF EXISTS public.v_cotizaciones_completa CASCADE;
CREATE VIEW public.v_cotizaciones_completa AS
SELECT
  c.*,
  cl.numero_cliente, cl.nombre AS cliente_nombre, cl.ruc_cedula AS cliente_ruc, cl.correo AS cliente_correo, cl.telefono AS cliente_telefono,
  p.codigo AS proyecto_codigo, p.nombre AS proyecto_nombre,
  u.nombre_completo AS creado_por_nombre,
  CASE
    WHEN c.fecha_validez IS NOT NULL THEN (c.fecha_validez - CURRENT_DATE)
    ELSE NULL
  END AS dias_para_vencer
FROM public.cotizaciones c
LEFT JOIN public.clientes cl ON cl.id_cliente = c.id_cliente
LEFT JOIN public.proyectos p ON p.id_proyecto = c.id_proyecto
LEFT JOIN public.usuarios u ON u.id = c.created_by;

-- Pagos completa
DROP VIEW IF EXISTS public.v_pagos_completa CASCADE;
CREATE VIEW public.v_pagos_completa AS
SELECT
  p.*,
  c.numero_cliente, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
  pr.codigo AS proyecto_codigo, pr.nombre AS proyecto_nombre,
  se.nombre AS sub_etapa_nombre
FROM public.pagos p
LEFT JOIN public.clientes c ON c.id_cliente = p.id_cliente
LEFT JOIN public.proyectos pr ON pr.id_proyecto = p.id_proyecto
LEFT JOIN public.sub_etapas se ON se.id_sub_etapa = p.id_sub_etapa;

-- Gastos completa
DROP VIEW IF EXISTS public.v_gastos_completa CASCADE;
CREATE VIEW public.v_gastos_completa AS
SELECT
  g.*,
  p.codigo AS proyecto_codigo, p.nombre AS proyecto_nombre,
  e.nombre AS etapa_nombre,
  u.nombre_completo AS creado_por_nombre
FROM public.gastos g
LEFT JOIN public.proyectos p ON p.id_proyecto = g.id_proyecto
LEFT JOIN public.etapas e ON e.id_etapa = g.id_etapa
LEFT JOIN public.usuarios u ON u.id = g.created_by;

-- Dashboard: ingresos vs gastos del mes
DROP VIEW IF EXISTS public.v_resumen_mensual CASCADE;
CREATE VIEW public.v_resumen_mensual AS
SELECT
  DATE_TRUNC('month', p.fecha_pago)::date AS mes,
  COALESCE(SUM(p.monto) FILTER (WHERE p.estado = 'CONFIRMADO'), 0) AS total_ingresos,
  COALESCE(SUM(g.monto), 0) AS total_gastos,
  COUNT(DISTINCT p.id_pago) FILTER (WHERE p.estado = 'CONFIRMADO') AS cantidad_pagos,
  COUNT(DISTINCT g.id_gasto) AS cantidad_gastos
FROM public.pagos p
FULL JOIN public.gastos g ON DATE_TRUNC('month', g.fecha) = DATE_TRUNC('month', p.fecha_pago)
GROUP BY DATE_TRUNC('month', p.fecha_pago)
ORDER BY 1 DESC;

-- Dashboard: proyectos por estado
DROP VIEW IF EXISTS public.v_estadisticas_proyectos CASCADE;
CREATE VIEW public.v_estadisticas_proyectos AS
SELECT
  COUNT(*) AS total_proyectos,
  COUNT(*) FILTER (WHERE estado = 'COTIZACION') AS cotizacion,
  COUNT(*) FILTER (WHERE estado = 'EN_CURSO') AS en_curso,
  COUNT(*) FILTER (WHERE estado = 'COMPLETADO') AS completados,
  COUNT(*) FILTER (WHERE estado = 'CANCELADO') AS cancelados,
  COALESCE(SUM(presupuesto_total) FILTER (WHERE estado IN ('EN_CURSO','COMPLETADO')), 0) AS total_presupuestado,
  COALESCE(SUM(total_pagado), 0) AS total_cobrado
FROM public.proyectos;

-- =========================================================
-- ÍNDICES
-- =========================================================
CREATE INDEX idx_clientes_numero          ON public.clientes(numero_cliente);
CREATE INDEX idx_clientes_nombre          ON public.clientes(nombre);
CREATE INDEX idx_proyectos_cliente        ON public.proyectos(id_cliente);
CREATE INDEX idx_proyectos_estado         ON public.proyectos(estado);
CREATE INDEX idx_proyectos_codigo         ON public.proyectos(codigo);
CREATE INDEX idx_etapas_proyecto          ON public.etapas(id_proyecto);
CREATE INDEX idx_sub_etapas_etapa         ON public.sub_etapas(id_etapa);
CREATE INDEX idx_avance_sub_etapa         ON public.avance_sub_etapa(id_sub_etapa, created_at DESC);
CREATE INDEX idx_cotizaciones_cliente     ON public.cotizaciones(id_cliente);
CREATE INDEX idx_cotizaciones_estado      ON public.cotizaciones(estado);
CREATE INDEX idx_cotizacion_items_cotiz   ON public.cotizacion_items(id_cotizacion);
CREATE INDEX idx_pagos_cliente            ON public.pagos(id_cliente);
CREATE INDEX idx_pagos_proyecto           ON public.pagos(id_proyecto);
CREATE INDEX idx_gastos_proyecto          ON public.gastos(id_proyecto);
CREATE INDEX idx_gastos_etapa             ON public.gastos(id_etapa);
CREATE INDEX idx_gastos_tipo              ON public.gastos(tipo);
CREATE INDEX idx_inventario_categoria     ON public.inventario(categoria);
CREATE INDEX idx_consumo_inventario_item  ON public.consumo_inventario(id_item);
CREATE INDEX idx_consumo_inventario_sub   ON public.consumo_inventario(id_sub_etapa);
CREATE INDEX idx_auditoria_tabla          ON public.auditoria(tabla, registro_id);
CREATE INDEX idx_notif_destinatario       ON public.notificaciones(destinatario_id);
CREATE INDEX idx_notif_estado             ON public.notificaciones(estado);

-- =========================================================
-- TRIGGERS
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_proyectos_updated ON public.proyectos;
CREATE TRIGGER trg_proyectos_updated BEFORE UPDATE ON public.proyectos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_cotizaciones_updated ON public.cotizaciones;
CREATE TRIGGER trg_cotizaciones_updated BEFORE UPDATE ON public.cotizaciones
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_inventario_updated ON public.inventario;
CREATE TRIGGER trg_inventario_updated BEFORE UPDATE ON public.inventario
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Trigger: restar del inventario cuando se registra consumo
CREATE OR REPLACE FUNCTION public.tg_descontar_inventario()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.inventario
  SET cantidad_actual = cantidad_actual - NEW.cantidad
  WHERE id_item = NEW.id_item;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_consumo_descontar ON public.consumo_inventario;
CREATE TRIGGER trg_consumo_descontar
  AFTER INSERT ON public.consumo_inventario
  FOR EACH ROW EXECUTE FUNCTION public.tg_descontar_inventario();

-- Trigger: recalcular totales de cotización
CREATE OR REPLACE FUNCTION public.tg_recalcular_totales_cotizacion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_cotizacion_id UUID;
BEGIN
  v_cotizacion_id := COALESCE(NEW.id_cotizacion, OLD.id_cotizacion);

  UPDATE public.cotizaciones
  SET
    subtotal_sin_itbms = COALESCE((
      SELECT SUM(subtotal) FROM public.cotizacion_items
      WHERE id_cotizacion = v_cotizacion_id
    ), 0),
    total_itbms = COALESCE((
      SELECT SUM(subtotal * itbms_pct / 100) FROM public.cotizacion_items
      WHERE id_cotizacion = v_cotizacion_id
    ), 0)
  WHERE id_cotizacion = v_cotizacion_id;

  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_recalc_cotizacion ON public.cotizacion_items;
CREATE TRIGGER trg_recalc_cotizacion
  AFTER INSERT OR UPDATE OR DELETE ON public.cotizacion_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_recalcular_totales_cotizacion();

-- =========================================================
-- STORAGE
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('arquitecto', 'arquitecto', true)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- RLS (Row Level Security)
-- =========================================================
ALTER TABLE public.clientes        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_etapas      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.avance_sub_etapa DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizacion_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizacion_auditoria DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumo_inventario DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_empresa DISABLE ROW LEVEL SECURITY;

-- =========================================================
-- DATOS INICIALES
-- =========================================================
-- Crear usuario ROOT desde Auth > Users en el Dashboard, luego:
--
-- INSERT INTO public.usuarios (id, email, email_login, nombre_completo, rol, activo, permisos)
-- VALUES (
--   '<UUID_DEL_USUARIO_AUTH>',
--   'admin@miestudio.com',
--   'admin@miestudio.com',
--   'Administrador',
--   'ROOT',
--   true,
--   '{"dashboard":true,"clientes":true,"proyectos":true,"inventario":true,
--     "cotizaciones":true,"pagos":true,"gastos":true,"estadocuenta":true,
--     "usuarios":true,"permisos":true,"reportes":true,"auditoria":true,"configuracion":true}'::jsonb
-- );

--
-- Insertar las 10 fases de construcción predeterminadas
-- (se ejecuta automáticamente al crear un proyecto desde el frontend,
--  o manualmente con este script):
--
-- DO $$
-- DECLARE
--   v_id_proyecto UUID := '<ID_DEL_PROYECTO>';
--   v_etapa_id UUID;
-- BEGIN
--   INSERT INTO public.etapas (id_proyecto, nombre, orden, peso_porcentaje, presupuesto) VALUES (v_id_proyecto, 'PRELIMINAR', 0, 5, 0) RETURNING id_etapa INTO v_etapa_id;
--     INSERT INTO public.sub_etapas (id_etapa, nombre, orden, peso_porcentaje, presupuesto, estado) VALUES (v_etapa_id, 'Permisos', 0, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Desmonte y limpieza', 1, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Caseta', 2, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Medidor temporal', 3, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Baño', 4, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Conexión a agua', 5, 0, 0, 'PENDIENTE');
--   INSERT INTO public.etapas (id_proyecto, nombre, orden, peso_porcentaje, presupuesto) VALUES (v_id_proyecto, 'MARCACIÓN', 1, 5, 0) RETURNING id_etapa INTO v_etapa_id;
--     INSERT INTO public.sub_etapas (id_etapa, nombre, orden, peso_porcentaje, presupuesto, estado) VALUES (v_etapa_id, 'Trazado y nivelación', 0, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Movimiento de tierra', 1, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Replanteo', 2, 0, 0, 'PENDIENTE');
--   INSERT INTO public.etapas (id_proyecto, nombre, orden, peso_porcentaje, presupuesto) VALUES (v_id_proyecto, 'CIMIENTOS / FUNDACIÓN', 2, 15, 0) RETURNING id_etapa INTO v_etapa_id;
--     INSERT INTO public.sub_etapas (id_etapa, nombre, orden, peso_porcentaje, presupuesto, estado) VALUES (v_etapa_id, 'Trazado fundación', 0, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Excavación fundación', 1, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Armado acero', 2, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Colocación acero', 3, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Vaciado concreto', 4, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Muros de cimentación', 5, 0, 0, 'PENDIENTE');
--   INSERT INTO public.etapas (id_proyecto, nombre, orden, peso_porcentaje, presupuesto) VALUES (v_id_proyecto, 'LOSAS', 3, 10, 0) RETURNING id_etapa INTO v_etapa_id;
--     INSERT INTO public.sub_etapas (id_etapa, nombre, orden, peso_porcentaje, presupuesto, estado) VALUES (v_etapa_id, 'Trazado pisos', 0, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Formaletas pisos', 1, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Instalaciones plomería', 2, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Instalaciones eléctricas', 3, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Vaciado de concreto', 4, 0, 0, 'PENDIENTE');
--   INSERT INTO public.etapas (id_proyecto, nombre, orden, peso_porcentaje, presupuesto) VALUES (v_id_proyecto, 'MUROS Y COLUMNAS', 4, 20, 0) RETURNING id_etapa INTO v_etapa_id;
--     INSERT INTO public.sub_etapas (id_etapa, nombre, orden, peso_porcentaje, presupuesto, estado) VALUES (v_etapa_id, 'Trazado paredes', 0, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Formaletas columnas', 1, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Formaletas vigas', 2, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Armado acero', 3, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Colocación acero', 4, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Vaciado concreto', 5, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Bloqueo paredes', 6, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Instalaciones eléctricas', 7, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Instalaciones plomería', 8, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Repello y mochetas', 9, 0, 0, 'PENDIENTE');
--   INSERT INTO public.etapas (id_proyecto, nombre, orden, peso_porcentaje, presupuesto) VALUES (v_id_proyecto, 'CUBIERTA', 5, 10, 0) RETURNING id_etapa INTO v_etapa_id;
--     INSERT INTO public.sub_etapas (id_etapa, nombre, orden, peso_porcentaje, presupuesto, estado) VALUES (v_etapa_id, 'Estructura de cubierta', 0, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Instalación aislantes', 1, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Instalación de cubierta', 2, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Instalación eléctrica', 3, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Refuerzos de techo', 4, 0, 0, 'PENDIENTE');
--   INSERT INTO public.etapas (id_proyecto, nombre, orden, peso_porcentaje, presupuesto) VALUES (v_id_proyecto, 'PUERTAS Y VENTANAS', 6, 5, 0) RETURNING id_etapa INTO v_etapa_id;
--     INSERT INTO public.sub_etapas (id_etapa, nombre, orden, peso_porcentaje, presupuesto, estado) VALUES (v_etapa_id, 'Instalación de puertas', 0, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Instalación de ventanas', 1, 0, 0, 'PENDIENTE');
--   INSERT INTO public.etapas (id_proyecto, nombre, orden, peso_porcentaje, presupuesto) VALUES (v_id_proyecto, 'ACABADOS E INSTALACIONES', 7, 15, 0) RETURNING id_etapa INTO v_etapa_id;
--     INSERT INTO public.sub_etapas (id_etapa, nombre, orden, peso_porcentaje, presupuesto, estado) VALUES (v_etapa_id, 'Inst. Sist. Eléctrico', 0, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Inst. Sist. Plomería', 1, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Inst. Artefactos sanitarios', 2, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Inst. Revestimientos', 3, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Inst. Mobiliario', 4, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Aplicación de bases y pinturas', 5, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Inst. Cielorasos', 6, 0, 0, 'PENDIENTE');
--   INSERT INTO public.etapas (id_proyecto, nombre, orden, peso_porcentaje, presupuesto) VALUES (v_id_proyecto, 'TRABAJOS FINALES', 8, 5, 0) RETURNING id_etapa INTO v_etapa_id;
--     INSERT INTO public.sub_etapas (id_etapa, nombre, orden, peso_porcentaje, presupuesto, estado) VALUES (v_etapa_id, 'Demolición inst. temporales', 0, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Limpieza interior', 1, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Limpieza exterior', 2, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Labores de jardinería', 3, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Cercas y muros externos', 4, 0, 0, 'PENDIENTE');
--   INSERT INTO public.etapas (id_proyecto, nombre, orden, peso_porcentaje, presupuesto) VALUES (v_id_proyecto, 'ENTREGA', 9, 10, 0) RETURNING id_etapa INTO v_etapa_id;
--     INSERT INTO public.sub_etapas (id_etapa, nombre, orden, peso_porcentaje, presupuesto, estado) VALUES (v_etapa_id, 'Permisos de ocupación', 0, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Conexiones eléctricas (NATURGY)', 1, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Conexiones sanitarias (Municipio)', 2, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Conexiones acueducto (Municipio)', 3, 0, 0, 'PENDIENTE'), (v_etapa_id, 'Entrega conforme', 4, 0, 0, 'PENDIENTE');
-- END $$;

-- =========================================================
-- FIN DEL SCHEMA
-- =========================================================
