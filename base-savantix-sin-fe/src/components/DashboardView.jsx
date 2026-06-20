import React, { useState, useEffect } from 'react';
import {
  DollarSign, ClipboardList, FileText, MapPin, AlertCircle,
  Wrench, UserPlus, Receipt, Package, Activity,
  TrendingUp, TrendingDown, Clock, CheckCircle2, Trophy, Award, Medal,
  Target, BarChart3, Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';

const SAVANTE_BLUE = '#003153';

// =========================================================
// COMPONENTES PEQUEÑOS
// =========================================================
function KpiCard({ icon: Icon, label, value, sublabel, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group bg-white rounded-2xl p-3 sm:p-5 shadow-sm border border-gray-100 text-left w-full transition-all hover:shadow-lg hover:border-brand-200 hover:-translate-y-0.5 ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div
          className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
          style={{ backgroundColor: SAVANTE_BLUE + '15' }}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: SAVANTE_BLUE }} />
        </div>
      </div>
      <div className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 truncate">{value}</div>
      <div className="text-xs sm:text-sm text-gray-600 truncate">{label}</div>
      {sublabel && <div className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate">{sublabel}</div>}
    </button>
  );
}

function QuickCircle({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-2 transition-transform hover:-translate-y-1"
    >
      <div
        className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white shadow-md group-hover:shadow-xl transition-all"
        style={{ background: `linear-gradient(135deg, ${SAVANTE_BLUE} 0%, #1e4a73 100%)` }}
      >
        <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
      </div>
      <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center max-w-[80px] leading-tight">
        {label}
      </span>
    </button>
  );
}

// =========================================================
// META EMPRESA con barra de progreso animada
// =========================================================
function MetaEmpresaCard({ meta, facturadoMes, diasRestantes }) {
  if (!meta || meta.monto_objetivo <= 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <Target className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Meta mensual</h3>
            <p className="text-xs text-gray-500">No hay meta configurada para este mes</p>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Configura la meta desde <strong>Administración → Metas</strong>
        </p>
      </div>
    );
  }

  const objetivo = Number(meta.monto_objetivo);
  const facturado = Number(facturadoMes);
  const progreso = Math.min(100, (facturado / objetivo) * 100);
  const cumplido = progreso >= 100;
  const colorBarra = cumplido ? '#059669' : progreso >= 70 ? SAVANTE_BLUE : '#f59e0b';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: cumplido ? '#d1fae5' : SAVANTE_BLUE + '15' }}
          >
            <Target className="h-5 w-5" style={{ color: cumplido ? '#059669' : SAVANTE_BLUE }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Meta del mes</h3>
            <p className="text-xs text-gray-500">
              {cumplido ? '🎉 Meta alcanzada' : `Faltan ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} para cerrar`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: colorBarra }}>
            {progreso.toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-semibold text-gray-900">{formatCurrency(facturado)}</span>
          <span className="text-gray-500">de {formatCurrency(objetivo)}</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progreso}%`,
              background: `linear-gradient(90deg, ${colorBarra} 0%, ${colorBarra}dd 100%)`,
            }}
          />
        </div>
      </div>

      {!cumplido && (
        <p className="text-xs text-gray-500 mt-2">
          Faltan <strong>{formatCurrency(objetivo - facturado)}</strong> para alcanzar la meta
        </p>
      )}
    </div>
  );
}

// =========================================================
// PODIO DE TÉCNICOS
// =========================================================
function PodioTecnicos({ tecnicos, metasMap }) {
  if (!tecnicos || tecnicos.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Podio del mes
        </h3>
        <div className="text-center py-6 text-gray-400 text-sm">
          <Users className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          Sin facturación de técnicos este mes
        </div>
      </div>
    );
  }

  // Top 3
  const top3 = tecnicos.slice(0, 3);
  const resto = tecnicos.slice(3);

  // Reordenar para podio visual: 2do - 1ro - 3ro
  const podio = [];
  if (top3[1]) podio.push({ ...top3[1], lugar: 2, color: '#9ca3af', emoji: '🥈', altura: 70 });
  if (top3[0]) podio.push({ ...top3[0], lugar: 1, color: '#fbbf24', emoji: '🥇', altura: 90 });
  if (top3[2]) podio.push({ ...top3[2], lugar: 3, color: '#d97706', emoji: '🥉', altura: 55 });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-500" />
        Podio del mes
      </h3>

      {/* Podio visual */}
      <div className="flex items-end justify-center gap-2 sm:gap-3 mb-4">
        {podio.map(p => {
          const meta = metasMap[p.id_usuario];
          const cumplimiento = meta ? Math.min(100, (p.monto_facturado_mes / meta) * 100) : null;

          return (
            <div key={p.id_usuario} className="flex-1 flex flex-col items-center max-w-[120px] min-w-0">
              {/* Avatar */}
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg mb-1"
                style={{
                  background: `linear-gradient(135deg, ${p.color}, ${p.color}dd)`,
                }}
              >
                {p.nombre_completo?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              {/* Emoji */}
              <div className="text-xl sm:text-2xl mb-1">{p.emoji}</div>
              {/* Nombre */}
              <div className="text-xs font-semibold text-gray-900 text-center truncate w-full px-1">
                {p.nombre_completo?.split(' ')[0]}
              </div>
              {/* Monto */}
              <div className="text-xs sm:text-sm font-bold mb-2 truncate w-full text-center px-1" style={{ color: p.color }}>
                {formatCurrency(p.monto_facturado_mes)}
              </div>
              {/* Pedestal */}
              <div
                className="w-full rounded-t-lg flex items-center justify-center text-white font-bold text-sm"
                style={{
                  height: `${p.altura}px`,
                  background: `linear-gradient(180deg, ${p.color} 0%, ${p.color}cc 100%)`,
                }}
              >
                {p.lugar}°
              </div>
              {/* Cumplimiento de meta */}
              {cumplimiento !== null && (
                <div className="text-xs text-gray-500 mt-1 truncate">
                  {cumplimiento.toFixed(0)}% meta
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resto de técnicos en lista */}
      {resto.length > 0 && (
        <div className="border-t pt-3 space-y-1.5">
          {resto.map((t, i) => (
            <div key={t.id_usuario} className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 font-mono w-6">{i + 4}°</span>
              <span className="flex-1 text-gray-700 truncate">{t.nombre_completo}</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(t.monto_facturado_mes)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================
// GRÁFICA SIMPLE últimos 7 días (SVG sin librería)
// =========================================================
function GraficaVentas7Dias({ datos, comparativo }) {
  if (!datos || datos.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" style={{ color: SAVANTE_BLUE }} />
          Tendencia
        </h3>
        <div className="text-center py-6 text-gray-400 text-sm">Sin datos</div>
      </div>
    );
  }

  const maxMonto = Math.max(...datos.map(d => Number(d.monto_dia)), 1);
  const totalSemana = datos.reduce((s, d) => s + Number(d.monto_dia), 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="h-4 w-4" style={{ color: SAVANTE_BLUE }} />
            Últimos 7 días
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Total: {formatCurrency(totalSemana)}</p>
        </div>
        {comparativo !== null && (
          <div className={`text-right ${comparativo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            <div className="flex items-center gap-1 justify-end">
              {comparativo >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-lg font-bold">
                {comparativo >= 0 ? '+' : ''}{comparativo.toFixed(0)}%
              </span>
            </div>
            <div className="text-xs">vs mes anterior</div>
          </div>
        )}
      </div>

      {/* Barras */}
      <div className="flex items-end gap-2 h-32 mt-4">
        {datos.map((d, i) => {
          const monto = Number(d.monto_dia);
          const altura = (monto / maxMonto) * 100;
          const fecha = new Date(d.fecha);
          const diaSem = fecha.toLocaleDateString('es-PA', { weekday: 'short' }).slice(0, 1).toUpperCase();
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="text-xs font-medium text-gray-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {monto > 0 ? formatCurrency(monto).replace('USD ', '$') : '—'}
              </div>
              <div
                className="w-full rounded-t-md transition-all hover:opacity-80"
                style={{
                  height: `${Math.max(altura, 2)}%`,
                  background: monto > 0
                    ? `linear-gradient(180deg, ${SAVANTE_BLUE} 0%, ${SAVANTE_BLUE}aa 100%)`
                    : '#e5e7eb',
                  minHeight: '4px',
                }}
              />
              <div className="text-xs text-gray-500">{diaSem}</div>
              <div className="text-xs text-gray-400">{fecha.getDate()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =========================================================
// TOP CLIENTES
// =========================================================
function TopClientes({ clientes }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Users className="h-4 w-4" style={{ color: SAVANTE_BLUE }} />
        Top 5 Clientes
      </h3>
      {clientes.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">Sin facturación este mes</div>
      ) : (
        <div className="space-y-2">
          {clientes.map((c, i) => (
            <div key={c.id_cliente} className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: SAVANTE_BLUE }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{c.nombre}</div>
                <div className="text-xs text-gray-500">{c.cantidad_pagos} pago{c.cantidad_pagos !== 1 ? 's' : ''}</div>
              </div>
              <div className="text-sm font-bold" style={{ color: SAVANTE_BLUE }}>
                {formatCurrency(c.monto_facturado)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================
// PRODUCTOS MÁS VENDIDOS
// =========================================================
function ProductosMasVendidos({ productos }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Package className="h-4 w-4" style={{ color: SAVANTE_BLUE }} />
        Productos top del mes
      </h3>
      {productos.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">Sin ventas este mes</div>
      ) : (
        <div className="space-y-2">
          {productos.map((p, i) => (
            <div key={p.id_catalogo} className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: SAVANTE_BLUE }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{p.nombre}</div>
                <div className="text-xs text-gray-500">{p.sku}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-900">{p.cantidad_vendida} u.</div>
                <div className="text-xs text-gray-500">{formatCurrency(p.monto_total)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================
// DASHBOARD PRINCIPAL
// =========================================================
export default function DashboardView({ profile, setCurrentView }) {
  const [stats, setStats] = useState({
    cobradoHoy: 0,
    facturadoMes: 0,
    facturadoMesAnterior: 0,
    ordenesAbiertas: 0,
    presupuestosPorVencer: 0,
    visitasPendientes: 0,
  });
  const [metaEmpresa, setMetaEmpresa] = useState(null);
  const [tecnicos, setTecnicos] = useState([]);
  const [metasUsuariosMap, setMetasUsuariosMap] = useState({});
  const [topClientes, setTopClientes] = useState([]);
  const [productosTop, setProductosTop] = useState([]);
  const [ventas7d, setVentas7d] = useState([]);
  const [actividad, setActividad] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const ahora = new Date();
      const hoy = ahora.toISOString().split('T')[0];
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];
      const inicioMesAnt = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString().split('T')[0];
      const finMesAnt = new Date(ahora.getFullYear(), ahora.getMonth(), 0).toISOString().split('T')[0];

      // Día final del mes
      const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
      const diasRestantes = Math.max(0, Math.ceil((finMes - ahora) / (1000 * 60 * 60 * 24)));

      const [
        pagosHoy, pagosMes, pagosMesAnt,
        ordenes, presupuestos, visitas, catalogo,
        meta, productividad, metasU, topCli, prodTop, ventas7,
      ] = await Promise.all([
        supabase.from('pagos').select('monto').eq('fecha_pago', hoy).neq('estado', 'ANULADO'),
        supabase.from('pagos').select('monto').gte('fecha_pago', inicioMes).lte('fecha_pago', hoy).neq('estado', 'ANULADO'),
        supabase.from('pagos').select('monto').gte('fecha_pago', inicioMesAnt).lte('fecha_pago', finMesAnt).neq('estado', 'ANULADO'),
        supabase.from('ordenes_taller').select('id_orden, numero_ticket, estado, created_at').not('estado', 'in', '(ENTREGADO,CANCELADO)').order('created_at', { ascending: false }).limit(50),
        supabase.from('v_presupuestos_completa').select('id_presupuesto, numero_presupuesto, dias_para_vencer, estado, created_at').in('estado', ['BORRADOR', 'ENVIADO']),
        supabase.from('visitas').select('id_visita, numero_visita, estado, fecha_visita').in('estado', ['PROGRAMADA', 'EN_RUTA', 'EN_SITIO']),
        supabase.from('catalogo_repuestos').select('id_catalogo, nombre, stock_disponible, stock_minimo').eq('activo', true),
        supabase.from('metas_empresa').select('*').eq('anio', ahora.getFullYear()).eq('mes', ahora.getMonth() + 1).maybeSingle(),
        supabase.from('v_productividad_tecnico').select('*'),
        supabase.from('metas_usuario').select('id_usuario, monto_objetivo').eq('anio', ahora.getFullYear()).eq('mes', ahora.getMonth() + 1),
        supabase.from('v_top_clientes_mes').select('*'),
        supabase.from('v_productos_mas_vendidos').select('*'),
        supabase.from('v_ventas_ultimos_7_dias').select('*'),
      ]);

      const cobradoHoy = (pagosHoy.data || []).reduce((s, p) => s + Number(p.monto || 0), 0);
      const facturadoMes = (pagosMes.data || []).reduce((s, p) => s + Number(p.monto || 0), 0);
      const facturadoMesAnt = (pagosMesAnt.data || []).reduce((s, p) => s + Number(p.monto || 0), 0);
      const presupuestosPorVencer = (presupuestos.data || []).filter(
        p => p.dias_para_vencer >= 0 && p.dias_para_vencer <= 3
      ).length;

      setStats({
        cobradoHoy, facturadoMes, facturadoMesAnterior: facturadoMesAnt,
        ordenesAbiertas: (ordenes.data || []).length,
        presupuestosPorVencer,
        visitasPendientes: (visitas.data || []).length,
        diasRestantes,
      });

      setMetaEmpresa(meta.data);
      setTecnicos((productividad.data || []).filter(t => t.monto_facturado_mes > 0));

      const map = {};
      (metasU.data || []).forEach(m => { map[m.id_usuario] = Number(m.monto_objetivo); });
      setMetasUsuariosMap(map);

      setTopClientes(topCli.data || []);
      setProductosTop(prodTop.data || []);
      setVentas7d(ventas7.data || []);

      // Actividad reciente
      const recienteOrdenes = (ordenes.data || []).slice(0, 3).map(o => ({
        icono: ClipboardList, titulo: `Orden ${o.numero_ticket}`,
        subtitulo: o.estado, fecha: o.created_at,
      }));
      const recientePresupuestos = (presupuestos.data || []).slice(0, 2).map(p => ({
        icono: FileText, titulo: `Presupuesto ${p.numero_presupuesto}`,
        subtitulo: p.estado, fecha: p.created_at,
      }));
      setActividad([...recienteOrdenes, ...recientePresupuestos]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5));

      // Alertas
      const alertasList = [];
      const stockBajo = (catalogo.data || []).filter(c => c.stock_disponible <= c.stock_minimo && c.stock_minimo > 0);
      if (stockBajo.length > 0) {
        alertasList.push({ icono: Package, mensaje: `${stockBajo.length} producto${stockBajo.length > 1 ? 's' : ''} con stock bajo`, accion: () => setCurrentView('catalogo') });
      }
      if (presupuestosPorVencer > 0) {
        alertasList.push({ icono: Clock, mensaje: `${presupuestosPorVencer} presupuesto${presupuestosPorVencer > 1 ? 's vencen' : ' vence'} en 3 días o menos`, accion: () => setCurrentView('presupuestos') });
      }
      const visitasHoy = (visitas.data || []).filter(v => v.fecha_visita === hoy);
      if (visitasHoy.length > 0) {
        alertasList.push({ icono: MapPin, mensaje: `${visitasHoy.length} visita${visitasHoy.length > 1 ? 's programadas' : ' programada'} para hoy`, accion: () => setCurrentView('visitas') });
      }
      setAlertas(alertasList);
    } catch (err) {
      console.error('Error dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const saludo = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  const fechaHoy = new Date().toLocaleDateString('es-PA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Comparativo mes vs mes anterior
  const comparativo = stats.facturadoMesAnterior > 0
    ? ((stats.facturadoMes - stats.facturadoMesAnterior) / stats.facturadoMesAnterior) * 100
    : null;

  const permisos = profile?.permisos || {};
  const accesosRapidos = [
    permisos.ordenes && { icon: Wrench, label: 'Nueva orden', view: 'ordenes' },
    permisos.visitas && { icon: MapPin, label: 'Nueva visita', view: 'visitas' },
    permisos.presupuestos && { icon: FileText, label: 'Nuevo presupuesto', view: 'presupuestos' },
    permisos.clientes && { icon: UserPlus, label: 'Nuevo cliente', view: 'clientes' },
    permisos.pagos && { icon: Receipt, label: 'Cobrar', view: 'pagos' },
    permisos.catalogo && { icon: Package, label: 'Catálogo', view: 'catalogo' },
  ].filter(Boolean);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* SALUDO */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {saludo}, {profile?.nombre_completo?.split(' ')[0] || 'Usuario'}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1 capitalize">
          {fechaHoy}
          <span className="hidden sm:inline"> · Aquí está el resumen de hoy</span>
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={DollarSign} label="Cobrado hoy" value={loading ? '...' : formatCurrency(stats.cobradoHoy)} onClick={permisos.pagos ? () => setCurrentView('pagos') : undefined} />
        <KpiCard icon={ClipboardList} label="Órdenes abiertas" value={loading ? '...' : stats.ordenesAbiertas} sublabel="En taller actualmente" onClick={permisos.ordenes ? () => setCurrentView('ordenes') : undefined} />
        <KpiCard icon={Clock} label="Por vencer" value={loading ? '...' : stats.presupuestosPorVencer} sublabel="Presupuestos · 3 días" onClick={permisos.presupuestos ? () => setCurrentView('presupuestos') : undefined} />
        <KpiCard icon={MapPin} label="Visitas pendientes" value={loading ? '...' : stats.visitasPendientes} sublabel="Programadas o en curso" onClick={permisos.visitas ? () => setCurrentView('visitas') : undefined} />
      </div>

      {/* META EMPRESA */}
      <MetaEmpresaCard meta={metaEmpresa} facturadoMes={stats.facturadoMes} diasRestantes={stats.diasRestantes} />

      {/* PODIO + GRÁFICA 7 DÍAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PodioTecnicos tecnicos={tecnicos} metasMap={metasUsuariosMap} />
        <GraficaVentas7Dias datos={ventas7d} comparativo={comparativo} />
      </div>

      {/* TOP CLIENTES + PRODUCTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopClientes clientes={topClientes} />
        <ProductosMasVendidos productos={productosTop} />
      </div>

      {/* ACCESOS RÁPIDOS */}
      {accesosRapidos.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Accesos rápidos</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              {accesosRapidos.map(a => (
                <QuickCircle key={a.view} icon={a.icon} label={a.label} onClick={() => setCurrentView(a.view)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ACTIVIDAD + ALERTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" style={{ color: SAVANTE_BLUE }} />
            Actividad reciente
          </h3>
          {actividad.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <CheckCircle2 className="h-8 w-8 mx-auto text-gray-300 mb-2" />
              Sin actividad reciente
            </div>
          ) : (
            <div className="space-y-3">
              {actividad.map((a, i) => {
                const Icon = a.icono;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: SAVANTE_BLUE + '15' }}>
                      <Icon className="h-4 w-4" style={{ color: SAVANTE_BLUE }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{a.titulo}</div>
                      <div className="text-xs text-gray-500">{a.subtitulo}</div>
                    </div>
                    <div className="text-xs text-gray-400">{tiempoRelativo(a.fecha)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Alertas
          </h3>
          {alertas.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-300 mb-2" />
              Todo en orden
            </div>
          ) : (
            <div className="space-y-2">
              {alertas.map((a, i) => {
                const Icon = a.icono;
                return (
                  <button key={i} onClick={a.accion} className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors text-left">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-amber-700" />
                    </div>
                    <span className="text-sm text-amber-900 font-medium flex-1">{a.mensaje}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function tiempoRelativo(fecha) {
  if (!fecha) return '';
  const ahora = new Date();
  const f = new Date(fecha);
  const diff = (ahora - f) / 1000;
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `Hace ${Math.floor(diff / 86400)}d`;
  return f.toLocaleDateString('es-PA', { day: '2-digit', month: 'short' });
}
