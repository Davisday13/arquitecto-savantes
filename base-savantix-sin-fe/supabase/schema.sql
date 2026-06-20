-- =========================================================
-- SISTEMA DE SOPORTE TÉCNICO - Schema consolidado
-- Gestión de entradas a taller y revisiones técnicas en sitio
-- =========================================================
-- Correr este archivo COMPLETO en el SQL Editor de Supabase
-- (Dashboard > SQL Editor > New query > pegar > Run)
-- =========================================================

-- ------- EXTENSIONES --------
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
  rol TEXT NOT NULL CHECK (rol IN ('ROOT','ADMIN','RECEPCIONISTA','TECNICO','CLIENTE')) DEFAULT 'TECNICO',
  -- Si rol = CLIENTE, este campo enlaza al cliente para que solo vea sus equipos
  id_cliente_asociado UUID,
  activo BOOLEAN DEFAULT true,
  permisos JSONB DEFAULT '{
    "dashboard": true,
    "clientes": false,
    "equipos": false,
    "ordenes": false,
    "visitas": false,
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
  numero_cliente TEXT NOT NULL UNIQUE, -- código interno tipo C-0001
  tipo_cliente TEXT NOT NULL CHECK (tipo_cliente IN ('EMPRESA','PERSONAL')) DEFAULT 'EMPRESA',
  nombre TEXT NOT NULL,                 -- razón social o nombre completo
  ruc_cedula TEXT,                       -- RUC si empresa, cédula si personal
  contacto_nombre TEXT,                  -- nombre del contacto principal (si empresa)
  telefono TEXT,
  correo TEXT,
  direccion TEXT,
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL
);

-- FK opcional usuarios -> clientes (después de crear clientes)
ALTER TABLE public.usuarios
  ADD CONSTRAINT fk_usuario_cliente
  FOREIGN KEY (id_cliente_asociado) REFERENCES public.clientes(id_cliente) ON DELETE SET NULL;

-- =========================================================
-- EQUIPOS (cada equipo identificado por número de serie)
-- =========================================================
DROP TABLE IF EXISTS public.equipos CASCADE;
CREATE TABLE public.equipos (
  id_equipo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente UUID NOT NULL REFERENCES public.clientes(id_cliente) ON DELETE CASCADE,
  tipo_equipo TEXT NOT NULL,             -- CCTV, IMPRESORA, COPIADORA, etc.
  marca TEXT,
  modelo TEXT,
  numero_serie TEXT NOT NULL,            -- identificador principal
  ubicacion TEXT,                         -- dónde está físicamente en el cliente
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  -- Un mismo número de serie puede existir solo una vez por cliente
  UNIQUE (id_cliente, numero_serie)
);

-- =========================================================
-- ÓRDENES DE TALLER (entradas de equipos al taller)
-- =========================================================
-- Secuencia para generar el ticket auto-numerado
CREATE SEQUENCE IF NOT EXISTS orden_ticket_seq START 1000;

DROP TABLE IF EXISTS public.ordenes_taller CASCADE;
CREATE TABLE public.ordenes_taller (
  id_orden UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_ticket TEXT NOT NULL UNIQUE DEFAULT ('OT-' || nextval('orden_ticket_seq')),
  id_cliente UUID NOT NULL REFERENCES public.clientes(id_cliente) ON DELETE RESTRICT,
  id_equipo UUID NOT NULL REFERENCES public.equipos(id_equipo) ON DELETE RESTRICT,
  fecha_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_entrada TIME NOT NULL DEFAULT CURRENT_TIME,
  falla_reportada TEXT NOT NULL,
  diagnostico TEXT,
  solucion TEXT,
  estado TEXT NOT NULL CHECK (estado IN (
    'RECIBIDO','DIAGNOSTICO','ESPERANDO_REPUESTO','REPARACION','PRUEBAS','LISTO','ENTREGADO','CANCELADO'
  )) DEFAULT 'RECIBIDO',
  id_tecnico_asignado UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  fecha_entrega DATE,                    -- cuándo se entregó al cliente
  recibido_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL, -- recepcionista
  -- Totales calculados desde repuestos + mano de obra
  total_repuestos DECIMAL(10,2) DEFAULT 0,
  total_mano_obra DECIMAL(10,2) DEFAULT 0,
  total_general DECIMAL(10,2) GENERATED ALWAYS AS (COALESCE(total_repuestos,0) + COALESCE(total_mano_obra,0)) STORED,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- REPUESTOS USADOS POR ORDEN
-- =========================================================
DROP TABLE IF EXISTS public.orden_repuestos CASCADE;
CREATE TABLE public.orden_repuestos (
  id_repuesto UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_orden UUID NOT NULL REFERENCES public.ordenes_taller(id_orden) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- MANO DE OBRA POR ORDEN
-- =========================================================
DROP TABLE IF EXISTS public.orden_mano_obra CASCADE;
CREATE TABLE public.orden_mano_obra (
  id_mano_obra UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_orden UUID NOT NULL REFERENCES public.ordenes_taller(id_orden) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  horas DECIMAL(5,2) NOT NULL DEFAULT 1 CHECK (horas > 0),
  precio_hora DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) GENERATED ALWAYS AS (horas * precio_hora) STORED,
  id_tecnico UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- HISTORIAL DE CAMBIOS DE ESTADO (para timeline de la orden)
-- =========================================================
DROP TABLE IF EXISTS public.orden_historial CASCADE;
CREATE TABLE public.orden_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_orden UUID NOT NULL REFERENCES public.ordenes_taller(id_orden) ON DELETE CASCADE,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  comentario TEXT,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  usuario_nombre TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- VISITAS EN SITIO (revisiones, asistencias, instalaciones, mantenimientos)
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS visita_numero_seq START 1000;

DROP TABLE IF EXISTS public.visitas CASCADE;
CREATE TABLE public.visitas (
  id_visita UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_visita TEXT NOT NULL UNIQUE DEFAULT ('VS-' || nextval('visita_numero_seq')),
  id_cliente UUID NOT NULL REFERENCES public.clientes(id_cliente) ON DELETE RESTRICT,
  -- equipo es opcional: una visita puede ser de varios equipos o de revisión general
  id_equipo UUID REFERENCES public.equipos(id_equipo) ON DELETE SET NULL,
  tipo_visita TEXT NOT NULL CHECK (tipo_visita IN ('REVISION','ASISTENCIA','INSTALACION','MANTENIMIENTO')) DEFAULT 'ASISTENCIA',
  fecha_visita DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_inicio TIME,
  hora_fin TIME,
  direccion_visita TEXT,
  motivo TEXT NOT NULL,                   -- motivo de la visita / qué se solicitó
  trabajo_realizado TEXT,                 -- qué se hizo en sitio
  observaciones TEXT,                     -- recomendaciones, notas adicionales
  estado TEXT NOT NULL CHECK (estado IN ('PROGRAMADA','EN_CURSO','COMPLETADA','CANCELADA')) DEFAULT 'PROGRAMADA',
  -- Checklist como JSON flexible: [{item: "...", ok: true, nota: "..."}, ...]
  checklist JSONB DEFAULT '[]'::jsonb,
  -- Firma del cliente como base64 (PNG) - se guarda en la fila para reportes simples
  firma_cliente TEXT,                     -- base64 PNG
  firma_cliente_nombre TEXT,              -- nombre de quien firma
  -- URLs de fotos en Storage
  fotos JSONB DEFAULT '[]'::jsonb,        -- ["url1","url2",...]
  id_tecnico UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  tecnico_nombre TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- AUDITORÍA (cambios sensibles)
-- =========================================================
DROP TABLE IF EXISTS public.auditoria CASCADE;
CREATE TABLE public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla TEXT NOT NULL,                    -- 'ordenes_taller','visitas','clientes', etc.
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
  -- relación opcional con la entidad que disparó la notificación
  entidad_tipo TEXT,                      -- 'ORDEN','VISITA'
  entidad_id UUID,
  estado TEXT NOT NULL CHECK (estado IN ('PENDIENTE','ENVIADA','FALLIDA','LEIDA')) DEFAULT 'PENDIENTE',
  enviada_at TIMESTAMPTZ,
  leida_at TIMESTAMPTZ,
  error_mensaje TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- CONFIGURACIÓN DE EMPRESA (para logo y datos del PDF)
-- =========================================================
DROP TABLE IF EXISTS public.configuracion_empresa CASCADE;
CREATE TABLE public.configuracion_empresa (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- una sola fila
  nombre_empresa TEXT NOT NULL DEFAULT 'Mi Empresa',
  ruc TEXT,
  telefono TEXT,
  correo TEXT,
  direccion TEXT,
  logo_url TEXT,                          -- URL en Storage
  pie_pagina_pdf TEXT,                    -- texto al pie del PDF
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.configuracion_empresa (id, nombre_empresa) VALUES (1, 'Soporte Técnico')
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- ÍNDICES
-- =========================================================
CREATE INDEX idx_clientes_numero          ON public.clientes(numero_cliente);
CREATE INDEX idx_clientes_nombre          ON public.clientes(nombre);
CREATE INDEX idx_equipos_cliente          ON public.equipos(id_cliente);
CREATE INDEX idx_equipos_serie            ON public.equipos(numero_serie);
CREATE INDEX idx_ordenes_cliente          ON public.ordenes_taller(id_cliente);
CREATE INDEX idx_ordenes_equipo           ON public.ordenes_taller(id_equipo);
CREATE INDEX idx_ordenes_estado           ON public.ordenes_taller(estado);
CREATE INDEX idx_ordenes_tecnico          ON public.ordenes_taller(id_tecnico_asignado);
CREATE INDEX idx_ordenes_fecha            ON public.ordenes_taller(fecha_entrada);
CREATE INDEX idx_ordenes_ticket           ON public.ordenes_taller(numero_ticket);
CREATE INDEX idx_repuestos_orden          ON public.orden_repuestos(id_orden);
CREATE INDEX idx_mano_obra_orden          ON public.orden_mano_obra(id_orden);
CREATE INDEX idx_historial_orden          ON public.orden_historial(id_orden, created_at DESC);
CREATE INDEX idx_visitas_cliente          ON public.visitas(id_cliente);
CREATE INDEX idx_visitas_tecnico          ON public.visitas(id_tecnico);
CREATE INDEX idx_visitas_fecha            ON public.visitas(fecha_visita);
CREATE INDEX idx_visitas_estado           ON public.visitas(estado);
CREATE INDEX idx_auditoria_tabla          ON public.auditoria(tabla, registro_id);
CREATE INDEX idx_auditoria_usuario        ON public.auditoria(usuario_id);
CREATE INDEX idx_auditoria_fecha          ON public.auditoria(created_at DESC);
CREATE INDEX idx_notif_destinatario       ON public.notificaciones(destinatario_id);
CREATE INDEX idx_notif_estado             ON public.notificaciones(estado);

-- =========================================================
-- TRIGGERS: actualizar updated_at automáticamente
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ordenes_updated ON public.ordenes_taller;
CREATE TRIGGER trg_ordenes_updated BEFORE UPDATE ON public.ordenes_taller
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_visitas_updated ON public.visitas;
CREATE TRIGGER trg_visitas_updated BEFORE UPDATE ON public.visitas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- TRIGGER: recalcular totales de orden cuando cambian repuestos / mano de obra
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_recalcular_totales_orden()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_orden_id UUID;
BEGIN
  v_orden_id := COALESCE(NEW.id_orden, OLD.id_orden);

  UPDATE public.ordenes_taller
  SET total_repuestos = COALESCE((SELECT SUM(subtotal) FROM public.orden_repuestos WHERE id_orden = v_orden_id), 0),
      total_mano_obra = COALESCE((SELECT SUM(subtotal) FROM public.orden_mano_obra WHERE id_orden = v_orden_id), 0)
  WHERE id_orden = v_orden_id;

  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_recalc_repuestos ON public.orden_repuestos;
CREATE TRIGGER trg_recalc_repuestos
  AFTER INSERT OR UPDATE OR DELETE ON public.orden_repuestos
  FOR EACH ROW EXECUTE FUNCTION public.tg_recalcular_totales_orden();

DROP TRIGGER IF EXISTS trg_recalc_mano_obra ON public.orden_mano_obra;
CREATE TRIGGER trg_recalc_mano_obra
  AFTER INSERT OR UPDATE OR DELETE ON public.orden_mano_obra
  FOR EACH ROW EXECUTE FUNCTION public.tg_recalcular_totales_orden();

-- =========================================================
-- TRIGGER: registrar cambios de estado en historial
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_registrar_cambio_estado()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.orden_historial (id_orden, estado_anterior, estado_nuevo, comentario, usuario_id)
    VALUES (NEW.id_orden, NULL, NEW.estado, 'Orden creada', NEW.recibido_por);
  ELSIF TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO public.orden_historial (id_orden, estado_anterior, estado_nuevo, comentario, usuario_id)
    VALUES (NEW.id_orden, OLD.estado, NEW.estado, NULL, NULL);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orden_estado ON public.ordenes_taller;
CREATE TRIGGER trg_orden_estado
  AFTER INSERT OR UPDATE OF estado ON public.ordenes_taller
  FOR EACH ROW EXECUTE FUNCTION public.tg_registrar_cambio_estado();

-- =========================================================
-- VISTA: orden completa con joins (cliente, equipo, técnico)
-- =========================================================
DROP VIEW IF EXISTS public.v_ordenes_completa CASCADE;
CREATE VIEW public.v_ordenes_completa AS
SELECT
  o.*,
  c.numero_cliente, c.nombre AS cliente_nombre, c.tipo_cliente, c.telefono AS cliente_telefono, c.correo AS cliente_correo,
  e.tipo_equipo, e.marca, e.modelo, e.numero_serie, e.ubicacion,
  t.nombre_completo AS tecnico_nombre,
  r.nombre_completo AS recibido_por_nombre
FROM public.ordenes_taller o
LEFT JOIN public.clientes c ON c.id_cliente = o.id_cliente
LEFT JOIN public.equipos e  ON e.id_equipo  = o.id_equipo
LEFT JOIN public.usuarios t ON t.id          = o.id_tecnico_asignado
LEFT JOIN public.usuarios r ON r.id          = o.recibido_por;

-- =========================================================
-- VISTA: visita completa con joins
-- =========================================================
DROP VIEW IF EXISTS public.v_visitas_completa CASCADE;
CREATE VIEW public.v_visitas_completa AS
SELECT
  v.*,
  c.numero_cliente, c.nombre AS cliente_nombre, c.tipo_cliente, c.telefono AS cliente_telefono, c.correo AS cliente_correo, c.direccion AS cliente_direccion,
  e.tipo_equipo, e.marca, e.modelo, e.numero_serie
FROM public.visitas v
LEFT JOIN public.clientes c ON c.id_cliente = v.id_cliente
LEFT JOIN public.equipos e  ON e.id_equipo  = v.id_equipo;

-- =========================================================
-- RLS - habilitado de forma simple
-- (la lógica de roles también vive en el cliente, igual que en Oasis,
--  pero aquí endurecemos para que un CLIENTE NUNCA vea órdenes ajenas)
-- =========================================================

-- Por defecto, dejamos RLS deshabilitado en tablas internas (lógica en cliente)
-- pero ACTIVAMOS RLS en las tablas que un CLIENTE puede consultar para evitar fugas.

ALTER TABLE public.clientes        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orden_repuestos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orden_mano_obra DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orden_historial DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_empresa DISABLE ROW LEVEL SECURITY;

-- Para EQUIPOS, ORDENES y VISITAS habilitamos RLS:
-- - Personal interno (no CLIENTE) ve todo
-- - CLIENTE solo ve los registros de su id_cliente_asociado
ALTER TABLE public.equipos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_taller  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas         ENABLE ROW LEVEL SECURITY;

-- Función helper: ¿es usuario interno (no CLIENTE)?
CREATE OR REPLACE FUNCTION public.es_usuario_interno()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND rol IN ('ROOT','ADMIN','RECEPCIONISTA','TECNICO') AND activo = true
  );
$$;

-- Función helper: id_cliente del usuario logueado (si es CLIENTE)
CREATE OR REPLACE FUNCTION public.mi_id_cliente()
RETURNS UUID LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id_cliente_asociado FROM public.usuarios WHERE id = auth.uid();
$$;

-- Políticas EQUIPOS
DROP POLICY IF EXISTS "Interno ve todos los equipos" ON public.equipos;
CREATE POLICY "Interno ve todos los equipos" ON public.equipos
  FOR ALL TO authenticated
  USING (public.es_usuario_interno())
  WITH CHECK (public.es_usuario_interno());

DROP POLICY IF EXISTS "Cliente ve solo sus equipos" ON public.equipos;
CREATE POLICY "Cliente ve solo sus equipos" ON public.equipos
  FOR SELECT TO authenticated
  USING (id_cliente = public.mi_id_cliente());

-- Políticas ORDENES_TALLER
DROP POLICY IF EXISTS "Interno ve todas las ordenes" ON public.ordenes_taller;
CREATE POLICY "Interno ve todas las ordenes" ON public.ordenes_taller
  FOR ALL TO authenticated
  USING (public.es_usuario_interno())
  WITH CHECK (public.es_usuario_interno());

DROP POLICY IF EXISTS "Cliente ve solo sus ordenes" ON public.ordenes_taller;
CREATE POLICY "Cliente ve solo sus ordenes" ON public.ordenes_taller
  FOR SELECT TO authenticated
  USING (id_cliente = public.mi_id_cliente());

-- Políticas VISITAS
DROP POLICY IF EXISTS "Interno ve todas las visitas" ON public.visitas;
CREATE POLICY "Interno ve todas las visitas" ON public.visitas
  FOR ALL TO authenticated
  USING (public.es_usuario_interno())
  WITH CHECK (public.es_usuario_interno());

DROP POLICY IF EXISTS "Cliente ve solo sus visitas" ON public.visitas;
CREATE POLICY "Cliente ve solo sus visitas" ON public.visitas
  FOR SELECT TO authenticated
  USING (id_cliente = public.mi_id_cliente());

-- =========================================================
-- STORAGE: bucket para fotos de visitas y logos
-- =========================================================
-- Crear el bucket desde el Dashboard:
--   Storage > New bucket > "soporte-tecnico" (público o privado, recomendado privado con signed URLs)
-- O desde SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('soporte-tecnico', 'soporte-tecnico', true)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- DATOS INICIALES
-- =========================================================
-- (Crear un usuario ROOT desde Auth > Users en el Dashboard, luego ejecutar:)
--
-- INSERT INTO public.usuarios (id, email, email_login, nombre_completo, rol, activo, permisos)
-- VALUES (
--   '<UUID_DEL_USUARIO_AUTH>',
--   'admin@miempresa.com',
--   'admin@miempresa.com',
--   'Administrador',
--   'ROOT',
--   true,
--   '{"dashboard":true,"clientes":true,"equipos":true,"ordenes":true,"visitas":true,
--     "usuarios":true,"permisos":true,"reportes":true,"auditoria":true,"configuracion":true}'::jsonb
-- );
--
-- =========================================================
-- FIN DEL SCHEMA
-- =========================================================
