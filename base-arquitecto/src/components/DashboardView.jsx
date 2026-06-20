import React, { useState, useEffect } from 'react';
import {
  DollarSign, Building2, FileText, Wallet, AlertCircle,
  TrendingUp, TrendingDown, Activity, BarChart3, Users, Target,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';

const BRAND_COLOR = '#1a3a4a';

function KpiCard({ icon: Icon, label, value, sublabel, onClick }) {
  return (
    <button onClick={onClick}
      className={`group bg-white rounded-2xl p-3 sm:p-5 shadow-sm border border-gray-100 text-left w-full transition-all hover:shadow-lg hover:border-brand-200 hover:-translate-y-0.5 ${onClick ? 'cursor-pointer' : 'cursor-default'}`}>
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
          style={{ backgroundColor: BRAND_COLOR + '15' }}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: BRAND_COLOR }} />
        </div>
      </div>
      <div className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 truncate">{value}</div>
      <div className="text-xs sm:text-sm text-gray-600 truncate">{label}</div>
      {sublabel && <div className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate">{sublabel}</div>}
    </button>
  );
}

export default function DashboardView({ profile, setCurrentView }) {
  const [stats, setStats] = useState({
    proyectosActivos: 0,
    cotizacionesPendientes: 0,
    ingresosMes: 0,
    gastosMes: 0,
    saldoMes: 0,
  });
  const [proyectosRecientes, setProyectosRecientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const ahora = new Date();
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];
      const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().split('T')[0];

      const [
        proyectosRes, cotizacionesRes,
        pagosMes, gastosMes, proyRecientes,
      ] = await Promise.all([
        supabase.from('v_estadisticas_proyectos').select('*').single(),
        supabase.from('cotizaciones').select('id_cotizacion').in('estado', ['BORRADOR', 'ENVIADO']),
        supabase.from('pagos').select('monto').gte('fecha_pago', inicioMes).lte('fecha_pago', finMes).eq('estado', 'CONFIRMADO'),
        supabase.from('gastos').select('monto').gte('fecha', inicioMes).lte('fecha', finMes),
        supabase.from('v_proyectos_completa').select('*').in('estado', ['EN_CURSO', 'COMPLETADO']).order('created_at', { ascending: false }).limit(5),
      ]);

      const ingresos = (pagosMes.data || []).reduce((s, p) => s + Number(p.monto || 0), 0);
      const gastos = (gastosMes.data || []).reduce((s, g) => s + Number(g.monto || 0), 0);

      setStats({
        proyectosActivos: (proyectosRes.data?.en_curso || 0) + (proyectosRes.data?.completados || 0),
        cotizacionesPendientes: (cotizacionesRes.data || []).length,
        ingresosMes: ingresos,
        gastosMes: gastos,
        saldoMes: ingresos - gastos,
      });

      setProyectosRecientes(proyRecientes.data || []);
    } catch (err) {
      console.error('Error dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const saludo = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos d\u00edas';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  const fechaHoy = new Date().toLocaleDateString('es-PA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const permisos = profile?.permisos || {};

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {saludo}, {profile?.nombre_completo?.split(' ')[0] || 'Usuario'}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1 capitalize">
          {fechaHoy}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Building2} label="Proyectos activos" value={loading ? '...' : stats.proyectosActivos}
          onClick={permisos.proyectos ? () => setCurrentView('proyectos') : undefined} />
        <KpiCard icon={FileText} label="Cotizaciones pendientes" value={loading ? '...' : stats.cotizacionesPendientes}
          onClick={permisos.cotizaciones ? () => setCurrentView('cotizaciones') : undefined} />
        <KpiCard icon={DollarSign} label="Ingresos del mes" value={loading ? '...' : formatCurrency(stats.ingresosMes)}
          onClick={permisos.pagos ? () => setCurrentView('pagos') : undefined} />
        <KpiCard icon={Wallet} label="Gastos del mes" value={loading ? '...' : formatCurrency(stats.gastosMes)}
          onClick={permisos.gastos ? () => setCurrentView('gastos') : undefined} />
      </div>

      {/* Saldo mensual */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Resumen financiero del mes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg">
            <div className="text-xs text-emerald-700 uppercase tracking-wider">Ingresos</div>
            <div className="text-2xl font-bold text-emerald-700">{loading ? '...' : formatCurrency(stats.ingresosMes)}</div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="text-xs text-red-700 uppercase tracking-wider">Gastos</div>
            <div className="text-2xl font-bold text-red-700">{loading ? '...' : formatCurrency(stats.gastosMes)}</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-700 uppercase tracking-wider">Saldo neto</div>
            <div className="text-2xl font-bold" style={{ color: stats.saldoMes >= 0 ? '#059669' : '#dc2626' }}>
              {loading ? '...' : formatCurrency(Math.abs(stats.saldoMes))}
              <span className="text-sm ml-1">{stats.saldoMes >= 0 ? 'positivo' : 'negativo'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Proyectos recientes */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-4 w-4" style={{ color: BRAND_COLOR }} />
            Proyectos recientes
          </h3>
          {permisos.proyectos && (
            <button onClick={() => setCurrentView('proyectos')} className="text-xs text-brand-700 font-medium hover:underline">
              Ver todos
            </button>
          )}
        </div>
        {loading ? (
          <div className="text-center py-4 text-gray-400 text-sm">Cargando...</div>
        ) : proyectosRecientes.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            <Building2 className="h-8 w-8 mx-auto text-gray-300 mb-2" />
            No hay proyectos activos
          </div>
        ) : (
          <div className="space-y-3">
            {proyectosRecientes.map(p => {
              const avance = Number(p.porcentaje_avance_general || 0);
              return (
                <div key={p.id_proyecto} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center">
                    <Building2 className="h-4 w-4" style={{ color: BRAND_COLOR }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{p.nombre}</div>
                    <div className="text-xs text-gray-500">{p.codigo} &middot; {p.cliente_nombre}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">{formatCurrency(p.presupuesto_total)}</div>
                    <div className="flex items-center gap-1 justify-end">
                      <div className="w-12 bg-gray-200 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-brand-600 transition-all" style={{ width: `${avance}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{avance.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Accesos r&aacute;pidos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Accesos r&aacute;pidos</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {permisos.proyectos && (
            <button onClick={() => setCurrentView('proyectos')}
              className="p-3 border rounded-lg text-left hover:bg-brand-50 hover:border-brand-300 transition-colors">
              <Building2 className="h-5 w-5 text-brand-700 mb-1" />
              <div className="text-sm font-medium text-gray-900">Nuevo proyecto</div>
            </button>
          )}
          {permisos.cotizaciones && (
            <button onClick={() => setCurrentView('cotizaciones')}
              className="p-3 border rounded-lg text-left hover:bg-brand-50 hover:border-brand-300 transition-colors">
              <FileText className="h-5 w-5 text-brand-700 mb-1" />
              <div className="text-sm font-medium text-gray-900">Cotizaci&oacute;n</div>
            </button>
          )}
          {permisos.pagos && (
            <button onClick={() => setCurrentView('pagos')}
              className="p-3 border rounded-lg text-left hover:bg-brand-50 hover:border-brand-300 transition-colors">
              <DollarSign className="h-5 w-5 text-brand-700 mb-1" />
              <div className="text-sm font-medium text-gray-900">Registrar pago</div>
            </button>
          )}
          {permisos.gastos && (
            <button onClick={() => setCurrentView('gastos')}
              className="p-3 border rounded-lg text-left hover:bg-brand-50 hover:border-brand-300 transition-colors">
              <Wallet className="h-5 w-5 text-brand-700 mb-1" />
              <div className="text-sm font-medium text-gray-900">Registrar gasto</div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
