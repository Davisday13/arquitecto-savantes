import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import { Card, Badge } from './ui/Card';
import { LayoutDashboard, FolderOpen, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COLORS_ESTADO = { COTIZACION: 'yellow', EN_CURSO: 'blue', PAUSADO: 'orange', FINALIZADO: 'green', CANCELADO: 'red' };

export default function DashboardView() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [proyectos, setProyectos] = useState([]);
  const [bajoStock, setBajoStock] = useState([]);

  useEffect(() => {
    supabase.from('v_estadisticas_proyectos').select('*').single().then(({ data }) => setStats(data || {}));
    supabase.from('v_proyectos_completa').select('*').order('created_at', { ascending: false }).limit(5).then(({ data }) => setProyectos(data || []));
    supabase.from('inventario_items').select('*').lte('stock', 'stock_min').eq('activo', true).then(({ data }) => setBajoStock(data || []));
  }, []);

  const accesos = [
    { label: 'Proyectos', icon: FolderOpen, path: '/proyectos', color: 'bg-blue-500' },
    { label: 'Pagos', icon: DollarSign, path: '/pagos', color: 'bg-emerald-500' },
    { label: 'Gastos', icon: TrendingUp, path: '/gastos', color: 'bg-amber-500' },
    { label: 'Inventario', icon: AlertTriangle, path: '/inventario', color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><LayoutDashboard className="h-6 w-6 text-brand-700" /> Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card onClick={() => navigate('/proyectos')} className="cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between"><div className="text-xs text-gray-500 uppercase">Proyectos</div><FolderOpen className="h-4 w-4 text-brand-600" /></div>
          <div className="text-2xl font-bold mt-1">{stats.total_proyectos || 0}</div>
          <div className="text-xs text-gray-400 mt-1">{stats.en_curso || 0} en curso · {stats.en_cotizacion || 0} cotización</div>
        </Card>
        <Card onClick={() => navigate('/pagos')} className="cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between"><div className="text-xs text-gray-500 uppercase">Cobrado</div><DollarSign className="h-4 w-4 text-emerald-600" /></div>
          <div className="text-2xl font-bold mt-1 text-emerald-700">{formatCurrency(stats.total_cobrado || 0)}</div>
          <div className="text-xs text-amber-600 mt-1">{formatCurrency(stats.total_por_cobrar || 0)} por cobrar</div>
        </Card>
        <Card onClick={() => navigate('/proyectos')} className="cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between"><div className="text-xs text-gray-500 uppercase">Presupuestado</div><TrendingUp className="h-4 w-4 text-amber-600" /></div>
          <div className="text-2xl font-bold mt-1">{formatCurrency(stats.total_presupuestado || 0)}</div>
        </Card>
        <Card onClick={() => navigate('/proyectos')} className="cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between"><div className="text-xs text-gray-500 uppercase">Completados</div><LayoutDashboard className="h-4 w-4 text-emerald-600" /></div>
          <div className="text-2xl font-bold mt-1">{stats.completados || 0}</div>
          <div className="text-xs text-gray-400 mt-1">{stats.pausados || 0} pausados</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h3 className="text-sm font-semibold mb-2">Proyectos recientes</h3>
          <div className="space-y-1.5">
            {proyectos.map(p => (
              <div key={p.id_proyecto} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100" onClick={() => navigate('/proyectos')}>
                <div><span className="font-mono text-gray-500">{p.numero_proyecto}</span> <strong>{p.nombre}</strong></div>
                <div className="flex items-center gap-2">
                  <Badge color={COLORS_ESTADO[p.estado]}>{p.estado}</Badge>
                  <span className="font-mono">{formatCurrency(p.monto_total)}</span>
                </div>
              </div>
            ))}
            {proyectos.length === 0 && <div className="text-xs text-gray-400 text-center py-4">Sin proyectos</div>}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold mb-2">Accesos rápidos</h3>
          <div className="grid grid-cols-2 gap-2">
            {accesos.map(a => {
              const Icon = a.icon;
              return (
                <div key={a.label} onClick={() => navigate(a.path)} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className={`w-8 h-8 ${a.color} rounded-lg flex items-center justify-center`}><Icon className="h-4 w-4 text-white" /></div>
                  <span className="text-sm font-medium">{a.label}</span>
                </div>
              );
            })}
          </div>
          {bajoStock.length > 0 && (
            <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-1 text-xs text-amber-800 font-medium"><AlertTriangle className="h-3 w-3" /> {bajoStock.length} items con stock bajo</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
