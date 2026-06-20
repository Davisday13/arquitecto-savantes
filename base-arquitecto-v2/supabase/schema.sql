-- ============================================================
-- ESQUEMA COMPLETO — Software de Control para Arquitectos v2
-- Basado en ESPEC_TECNICA_DESARROLLADOR_v2.pdf
-- ============================================================

-- 0. EXTENSIONES
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. TABLAS REUTILIZADAS DE SAVANTIX
-- ============================================================

create table if not exists usuarios (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  nombre        text not null,
  rol           text not null default 'ARQUITECTO' check (rol in ('ROOT','ADMIN','ARQUITECTO','ASISTENTE','CLIENTE')),
  activo        boolean default true,
  telefono      text,
  permisos_extra jsonb,
  ultimo_acceso timestamptz,
  created_at    timestamptz default now()
);

create table if not exists clientes (
  id_cliente    uuid primary key default gen_random_uuid(),
  tipo          text not null default 'PERSONA' check (tipo in ('PERSONA','EMPRESA')),
  nombre        text not null,
  documento     text,
  correo        text,
  telefono      text,
  telefono_alt  text,
  direccion     text,
  notas         text,
  activo        boolean default true,
  created_at    timestamptz default now(),
  created_by    uuid references usuarios(id)
);

create table if not exists configuracion_empresa (
  id                  int primary key default 1 check (id = 1),
  nombre_empresa      text not null default 'Mi Empresa',
  ruc                 text,
  telefono            text,
  correo              text,
  direccion           text,
  logo_url            text,
  pie_pagina_pdf      text default 'ARQUITECTURA & DISEÑO',
  moneda_simbolo      text not null default 'B/.',
  moneda_codigo       text not null default 'PAB',
  precios_incluyen_itbms boolean default false,
  itbms_default_pct   numeric(5,2) default 7.00,
  terminos_cotizacion text,
  created_at          timestamptz default now()
);

create table if not exists auditoria (
  id_auditoria  uuid primary key default gen_random_uuid(),
  tabla         text not null,
  operacion     text not null check (operacion in ('INSERT','UPDATE','DELETE')),
  id_registro   text,
  valores_viejos jsonb,
  valores_nuevos jsonb,
  usuario_id    uuid references usuarios(id),
  usuario_nombre text,
  direccion_ip  text,
  created_at    timestamptz default now()
);

create table if not exists notificaciones (
  id_notificacion uuid primary key default gen_random_uuid(),
  destinatario_id uuid not null references usuarios(id),
  titulo          text,
  mensaje         text not null,
  canal           text not null default 'INTERNA' check (canal in ('INTERNA','EMAIL','WHATSAPP')),
  tipo            text default 'INFO' check (tipo in ('INFO','EXITO','ADVERTENCIA','ERROR')),
  id_referencia   text,
  tabla_referencia text,
  estado          text not null default 'PENDIENTE' check (estado in ('PENDIENTE','ENVIADA','LEIDA','FALLIDA')),
  leida_at        timestamptz,
  created_at      timestamptz default now()
);

-- ============================================================
-- 2. TABLAS NUEVAS — DOMINIO ARQUITECTO
-- ============================================================

-- 2.1 PROYECTOS
create table if not exists proyectos (
  id_proyecto     uuid primary key default gen_random_uuid(),
  numero_proyecto text not null unique,
  id_cliente      uuid not null references clientes(id_cliente),
  nombre          text not null,
  descripcion     text,
  estado          text not null default 'COTIZACION'
                  check (estado in ('COTIZACION','EN_CURSO','PAUSADO','FINALIZADO','CANCELADO')),
  moneda          text not null default 'PAB',
  fecha_inicio    date,
  fecha_fin_est   date,
  monto_total     numeric(14,2) default 0,
  pagado_total    numeric(14,2) default 0,
  avance_pct      numeric(5,2)  default 0,
  pago_pct        numeric(5,2)  default 0,
  notas           text,
  created_at      timestamptz default now(),
  created_by      uuid references usuarios(id)
);

-- 2.2 ETAPAS
create table if not exists proyecto_etapas (
  id_etapa     uuid primary key default gen_random_uuid(),
  id_proyecto  uuid not null references proyectos(id_proyecto) on delete cascade,
  nombre       text not null,
  tipo         text not null check (tipo in ('DISENO','OBRA')),
  orden        int default 0,
  peso_pct     numeric(5,2) not null,
  avance_pct   numeric(5,2) default 0,
  monto_total  numeric(14,2) default 0,
  pagado_total numeric(14,2) default 0
);

-- 2.3 SUB-ETAPAS
create table if not exists proyecto_subetapas (
  id_subetapa uuid primary key default gen_random_uuid(),
  id_etapa    uuid not null references proyecto_etapas(id_etapa) on delete cascade,
  nombre      text not null,
  orden       int default 0,
  peso_pct    numeric(5,2)  not null,
  monto       numeric(14,2) not null default 0,
  avance_pct  numeric(5,2)  not null default 0,
  pagado      numeric(14,2) default 0,
  pago_pct    numeric(5,2)  default 0
);

-- 2.4 PAGOS
create table if not exists proyecto_pagos (
  id_pago        uuid primary key default gen_random_uuid(),
  id_proyecto    uuid not null references proyectos(id_proyecto) on delete cascade,
  id_subetapa    uuid references proyecto_subetapas(id_subetapa),
  numero_recibo  text,
  monto          numeric(14,2) not null check (monto > 0),
  metodo_pago    text,
  fecha          date not null default current_date,
  nota           text,
  anulado        boolean default false,
  anulado_motivo text,
  created_at     timestamptz default now(),
  created_by     uuid references usuarios(id)
);

-- 2.5 INVENTARIO — ITEMS
create table if not exists inventario_items (
  id_item     uuid primary key default gen_random_uuid(),
  codigo      text unique,
  nombre      text not null,
  unidad      text default 'und',
  stock       numeric(12,2) default 0,
  stock_min   numeric(12,2) default 0,
  costo_unit  numeric(14,2) default 0,
  precio_unit numeric(14,2) default 0,
  categoria   text default 'MATERIAL',
  activo      boolean default true,
  created_at  timestamptz default now(),
  created_by  uuid references usuarios(id)
);

-- 2.6 INVENTARIO — MOVIMIENTOS
create table if not exists inventario_movimientos (
  id_mov      uuid primary key default gen_random_uuid(),
  id_item     uuid not null references inventario_items(id_item),
  tipo        text not null check (tipo in ('ENTRADA','SALIDA','AJUSTE')),
  cantidad    numeric(12,2) not null,
  id_proyecto uuid references proyectos(id_proyecto),
  id_subetapa uuid references proyecto_subetapas(id_subetapa),
  motivo      text,
  costo_unit  numeric(14,2),
  fecha       date not null default current_date,
  created_at  timestamptz default now(),
  created_by  uuid references usuarios(id)
);

-- 2.7 GASTOS
create table if not exists proyecto_gastos (
  id_gasto     uuid primary key default gen_random_uuid(),
  tipo         text not null check (tipo in ('GENERAL','ETAPA')),
  id_proyecto  uuid references proyectos(id_proyecto),
  id_etapa     uuid references proyecto_etapas(id_etapa),
  id_subetapa  uuid references proyecto_subetapas(id_subetapa),
  descripcion  text not null,
  categoria    text default 'OTROS',
  monto        numeric(14,2) not null check (monto >= 0),
  fecha        date not null default current_date,
  comprobante  text,
  id_item      uuid references inventario_items(id_item),
  cantidad     numeric(12,2),
  created_at   timestamptz default now(),
  created_by   uuid references usuarios(id)
);

-- ============================================================
-- 3. ÍNDICES
-- ============================================================
create index idx_etapas_proyecto on proyecto_etapas(id_proyecto);
create index idx_subetapas_etapa on proyecto_subetapas(id_etapa);
create index idx_pagos_proyecto on proyecto_pagos(id_proyecto);
create index idx_pagos_subetapa on proyecto_pagos(id_subetapa);
create index idx_gastos_proyecto on proyecto_gastos(id_proyecto);
create index idx_movimientos_item on inventario_movimientos(id_item);
create index idx_notificaciones_dest on notificaciones(destinatario_id, estado);

-- ============================================================
-- 4. TRIGGERS — LÓGICA DE CÁLCULO
-- ============================================================

-- 4.1 RECÁLCULO: cuando cambia avance_pct de una sub-etapa
--   → etapa.avance_pct = Σ(sub.peso_pct × sub.avance_pct) / Σ(sub.peso_pct)
--   → proyecto.avance_pct = Σ(etapa.peso_pct × etapa.avance_pct) / Σ(etapa.peso_pct)
create or replace function recalc_avance_from_subetapa()
returns trigger as $$
declare
  v_id_etapa    uuid;
  v_id_proyecto uuid;
begin
  v_id_etapa := NEW.id_etapa;
  -- Recalcular etapa (normalizado por suma de pesos)
  update proyecto_etapas
  set avance_pct = coalesce((
    select sum(ps.peso_pct * ps.avance_pct) / greatest(sum(ps.peso_pct), 1)
    from proyecto_subetapas ps
    where ps.id_etapa = proyecto_etapas.id_etapa and ps.avance_pct is not null
  ), 0)
  where id_etapa = v_id_etapa
  returning id_proyecto into v_id_proyecto;
  -- Recalcular proyecto (solo etapas que tienen sub-etapas definidas)
  update proyectos
  set avance_pct = coalesce((
    select sum(pe.peso_pct * pe.avance_pct) / greatest(sum(pe.peso_pct), 1)
    from proyecto_etapas pe
    where pe.id_proyecto = proyectos.id_proyecto
      and pe.avance_pct is not null
      and exists (select 1 from proyecto_subetapas ps where ps.id_etapa = pe.id_etapa)
  ), 0)
  where id_proyecto = v_id_proyecto;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_subetapa_avance
  after insert or update of avance_pct on proyecto_subetapas
  for each row execute function recalc_avance_from_subetapa();

-- 4.2 RECÁLCULO: cuando se inserta/anula un pago
--   → sub.pagado = suma de pagos no anulados
--   → sub.pago_pct = pagado / monto
--   → etapa.pagado_total = Σ(sub.pagado)
--   → proyecto.pagado_total = Σ(etapa.pagado_total)
--   → proyecto.pago_pct = pagado_total / monto_total
create or replace function recalc_pago()
returns trigger as $$
declare
  v_id_subetapa  uuid;
  v_id_etapa     uuid;
  v_id_proyecto  uuid;
  v_monto_sub    numeric(14,2);
  v_pagado_sub   numeric(14,2);
begin
  v_id_subetapa := coalesce(NEW.id_subetapa, OLD.id_subetapa);

  if v_id_subetapa is not null then
    -- Recalcular sub-etapa
    select sum(monto) into v_pagado_sub
    from proyecto_pagos
    where id_subetapa = v_id_subetapa and (anulado is null or anulado = false);

    select monto, id_etapa into v_monto_sub, v_id_etapa
    from proyecto_subetapas where id_subetapa = v_id_subetapa;

    update proyecto_subetapas
    set pagado = coalesce(v_pagado_sub, 0),
        pago_pct = case when v_monto_sub > 0 then (coalesce(v_pagado_sub, 0) / v_monto_sub) * 100 else 0 end
    where id_subetapa = v_id_subetapa;

    -- Recalcular etapa
    update proyecto_etapas
    set pagado_total = coalesce((
      select sum(ps.pagado) from proyecto_subetapas ps where ps.id_etapa = proyecto_etapas.id_etapa
    ), 0)
    where id_etapa = v_id_etapa
    returning id_proyecto into v_id_proyecto;
  else
    -- Pago sin sub-etapa (anticipo a nivel proyecto)
    select id_proyecto into v_id_proyecto
    from proyectos where id_proyecto = coalesce(NEW.id_proyecto, OLD.id_proyecto);
  end if;

  -- Recalcular proyecto
  update proyectos
  set pagado_total = coalesce((
    select sum(coalesce(pe.pagado_total, 0)) from proyecto_etapas pe where pe.id_proyecto = proyectos.id_proyecto
  ), 0) + coalesce((
    select sum(monto) from proyecto_pagos
    where id_proyecto = proyectos.id_proyecto and id_subetapa is null
      and (anulado is null or anulado = false)
  ), 0),
  pago_pct = case when monto_total > 0
    then (pagado_total / monto_total) * 100
    else 0 end
  where id_proyecto = v_id_proyecto;

  return NEW;
end;
$$ language plpgsql;

create trigger trg_pago_recalcular
  after insert or update of anulado on proyecto_pagos
  for each row execute function recalc_pago();

-- 4.3 RECÁLCULO: cuando cambia monto de sub-etapa
--   → etapa.monto_total = Σ(sub.monto)
--   → proyecto.monto_total = Σ(etapa.monto_total)
create or replace function recalc_monto_subetapa()
returns trigger as $$
declare
  v_id_etapa    uuid;
  v_id_proyecto uuid;
begin
  v_id_etapa := NEW.id_etapa;
  update proyecto_etapas
  set monto_total = coalesce((
    select sum(ps.monto) from proyecto_subetapas ps where ps.id_etapa = proyecto_etapas.id_etapa
  ), 0)
  where id_etapa = v_id_etapa
  returning id_proyecto into v_id_proyecto;

  update proyectos
  set monto_total = coalesce((
    select sum(pe.monto_total) from proyecto_etapas pe where pe.id_proyecto = proyectos.id_proyecto
  ), 0)
  where id_proyecto = v_id_proyecto;

  return NEW;
end;
$$ language plpgsql;

create trigger trg_subetapa_monto
  after insert or update of monto on proyecto_subetapas
  for each row execute function recalc_monto_subetapa();

-- 4.4 SALIDA DE INVENTARIO → descuenta stock
create or replace function descontar_stock()
returns trigger as $$
begin
  if NEW.tipo = 'SALIDA' then
    update inventario_items
    set stock = stock - NEW.cantidad
    where id_item = NEW.id_item;
  elsif NEW.tipo = 'ENTRADA' then
    update inventario_items
    set stock = stock + NEW.cantidad
    where id_item = NEW.id_item;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_movimiento_stock
  after insert on inventario_movimientos
  for each row execute function descontar_stock();

-- ============================================================
-- 5. VISTAS
-- ============================================================

create or replace view v_proyectos_completa as
select
  p.id_proyecto, p.numero_proyecto, p.nombre, p.descripcion, p.estado, p.moneda,
  p.fecha_inicio, p.fecha_fin_est, p.monto_total, p.pagado_total,
  p.avance_pct, p.pago_pct,
  p.monto_total - p.pagado_total as saldo_pendiente,
  p.avance_pct - p.pago_pct as brecha,
  c.id_cliente, c.nombre as cliente_nombre, c.documento as cliente_documento,
  c.correo as cliente_correo, c.telefono as cliente_telefono,
  (select count(*) from proyecto_etapas pe where pe.id_proyecto = p.id_proyecto) as total_etapas,
  (select count(*) from proyecto_subetapas ps
    join proyecto_etapas pe on pe.id_etapa = ps.id_etapa
    where pe.id_proyecto = p.id_proyecto) as total_subetapas,
  (select count(*) from proyecto_pagos pp where pp.id_proyecto = p.id_proyecto and pp.anulado is not true) as total_pagos,
  u.nombre as creado_por_nombre,
  p.created_at
from proyectos p
left join clientes c on c.id_cliente = p.id_cliente
left join usuarios u on u.id = p.created_by;

create or replace view v_resumen_mensual as
select
  date_trunc('month', pp.fecha) as mes,
  count(distinct pp.id_pago) as total_pagos,
  count(distinct pp.id_proyecto) as proyectos_con_pago,
  sum(case when pp.anulado is not true then pp.monto else 0 end) as ingresos,
  count(distinct pg.id_gasto) as total_gastos,
  sum(pg.monto) as egresos
from proyecto_pagos pp
full join proyecto_gastos pg on date_trunc('month', pg.fecha) = date_trunc('month', pp.fecha)
group by date_trunc('month', pp.fecha), date_trunc('month', pg.fecha)
order by mes desc;

create or replace view v_estadisticas_proyectos as
select
  count(*) as total_proyectos,
  count(*) filter (where estado = 'COTIZACION') as en_cotizacion,
  count(*) filter (where estado = 'EN_CURSO') as en_curso,
  count(*) filter (where estado = 'PAUSADO') as pausados,
  count(*) filter (where estado = 'FINALIZADO') as completados,
  count(*) filter (where estado = 'CANCELADO') as cancelados,
  coalesce(sum(monto_total), 0) as total_presupuestado,
  coalesce(sum(pagado_total), 0) as total_cobrado,
  coalesce(sum(monto_total - pagado_total), 0) as total_por_cobrar
from proyectos;

-- ============================================================
-- 6. DATOS INICIALES
-- ============================================================
insert into configuracion_empresa (nombre_empresa, moneda_simbolo, moneda_codigo, itbms_default_pct)
values ('Mi Empresa de Arquitectura', 'B/.', 'PAB', 7.00)
on conflict (id) do nothing;
